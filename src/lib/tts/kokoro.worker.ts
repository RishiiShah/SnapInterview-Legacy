import { KokoroTTS } from "kokoro-js";

const MODEL_ID = "onnx-community/Kokoro-82M-v1.0-ONNX";

type WorkerRequest =
  | { type: "preload"; requestId: string }
  | { type: "synthesize"; requestId: string; generation: number; text: string; voice: string }
  | { type: "cancel"; generation: number };

let model: KokoroTTS | null = null;
let loadPromise: Promise<void> | null = null;
let activeGeneration = 0;

const workerScope = self as unknown as {
  addEventListener: (type: string, listener: (event: MessageEvent<WorkerRequest>) => void) => void;
  postMessage: (message: unknown, transfer?: Transferable[]) => void;
};

async function loadModel() {
  if (model) return;
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
        model = await KokoroTTS.from_pretrained(MODEL_ID, options);
        return;
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError instanceof Error ? lastError : new Error("Unable to load browser TTS model");
  })();

  try {
    await loadPromise;
  } catch (error) {
    loadPromise = null;
    throw error;
  }
}

workerScope.addEventListener("message", (event: MessageEvent<WorkerRequest>) => {
  void handleMessage(event.data);
});

async function handleMessage(message: WorkerRequest) {
  if (message.type === "cancel") {
    activeGeneration = message.generation;
    return;
  }

  try {
    await loadModel();

    if (message.type === "preload") {
      workerScope.postMessage({ type: "ready", requestId: message.requestId, status: "ready" });
      return;
    }

    const audio = await model!.generate(message.text, {
      voice: message.voice as keyof KokoroTTS["voices"],
    });
    if (message.generation !== activeGeneration) return;

    const pcm = audio.audio.slice().buffer;
    workerScope.postMessage(
      {
        type: "audio",
        requestId: message.requestId,
        generation: message.generation,
        pcm,
        sampleRate: audio.sampling_rate,
      },
      [pcm],
    );
  } catch (error) {
    workerScope.postMessage({
      type: "error",
      requestId: message.requestId,
      message: error instanceof Error ? error.message : "Browser TTS failed",
    });
  }
}
