import { pipeline } from "@huggingface/transformers";
import { downsampleTo16kHz } from "../audio/downsample";
import type { SttWorkerRequest } from "./stt-messages";

const MODEL_ID = "onnx-community/moonshine-base-ONNX";
const TARGET_SAMPLE_RATE = 16_000;

type Transcriber = (audio: Float32Array) => Promise<{ text: string } | Array<{ text: string }>>;

let transcriber: Transcriber | null = null;
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
    const attempts: Array<{ device: "webgpu" | "wasm"; dtype: "fp32" | "q8" }> = [];
    if (typeof navigator !== "undefined" && "gpu" in navigator) {
      attempts.push({ device: "webgpu", dtype: "fp32" });
    }
    attempts.push({ device: "wasm", dtype: "q8" });

    let lastError: unknown;
    for (const options of attempts) {
      try {
        transcriber = (await pipeline(
          "automatic-speech-recognition",
          MODEL_ID,
          options,
        )) as unknown as Transcriber;
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
    const output = await transcriber!(pcm);
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
