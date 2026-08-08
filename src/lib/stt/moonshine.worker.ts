import { pipeline } from "@huggingface/transformers";
import { downsampleTo16kHz } from "../audio/downsample";
import { buildAsrLoadPlan, transcribeOptionsFor, type AsrModelKind } from "./asr-models";
import type { SttWorkerRequest } from "./stt-messages";

const TARGET_SAMPLE_RATE = 16_000;

type Transcriber = (
  audio: Float32Array,
  options?: Record<string, unknown>,
) => Promise<{ text: string } | Array<{ text: string }>>;

let transcriber: Transcriber | null = null;
let loadedKind: AsrModelKind = "moonshine";
let loadPromise: Promise<void> | null = null;
let activeGeneration = 0;

const workerScope = self as unknown as {
  addEventListener: (type: string, listener: (event: MessageEvent<SttWorkerRequest>) => void) => void;
  postMessage: (message: unknown, transfer?: Transferable[]) => void;
};

async function loadModel() {
  if (transcriber) return;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    const hasGpu = typeof navigator !== "undefined" && "gpu" in navigator;
    const plan = buildAsrLoadPlan(hasGpu);

    let lastError: unknown;
    for (const attempt of plan) {
      try {
        transcriber = (await pipeline("automatic-speech-recognition", attempt.modelId, {
          device: attempt.device,
          dtype: attempt.dtype,
        })) as unknown as Transcriber;
        loadedKind = attempt.kind;
        return;
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError instanceof Error ? lastError : new Error("Unable to load STT model");
  })();

  try {
    await loadPromise;
  } catch (error) {
    loadPromise = null;
    throw error;
  }
}

workerScope.addEventListener("message", (event: MessageEvent<SttWorkerRequest>) => {
  void handleMessage(event.data);
});

async function handleMessage(message: SttWorkerRequest) {
  if (message.type === "cancel") {
    activeGeneration = message.generation;
    return;
  }

  try {
    await loadModel();

    if (message.type === "preload") {
      workerScope.postMessage({ type: "ready", requestId: message.requestId });
      return;
    }

    // ponytail: re-transcribes the whole rolling buffer each tick (D2). Ceiling:
    // Moonshine-base handles short utterances well; if answers get long enough to
    // hit its context limit or lag, switch to VAD-segmented chunks here.
    const pcm = downsampleTo16kHz(new Float32Array(message.pcm), message.sampleRate, TARGET_SAMPLE_RATE);
    const output = await transcriber!(pcm, transcribeOptionsFor(loadedKind));
    if (message.generation !== activeGeneration) return;

    const text = Array.isArray(output) ? (output[0]?.text ?? "") : output.text;
    workerScope.postMessage({
      type: "result",
      requestId: message.requestId,
      generation: message.generation,
      text: text.trim(),
    });
  } catch (error) {
    workerScope.postMessage({
      type: "error",
      requestId: message.requestId,
      message: error instanceof Error ? error.message : "STT transcription failed",
    });
  }
}
