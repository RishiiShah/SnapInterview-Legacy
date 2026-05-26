/// <reference lib="webworker" />

import { env, pipeline } from "@xenova/transformers/dist/transformers.min.js";
import {
  WHISPER_MODEL_ID,
  WHISPER_MAX_PARTIAL_WINDOW_SEC,
  WHISPER_PARTIAL_INTERVAL_SEC,
  WHISPER_SAMPLE_RATE,
  type SttWorkerRequest,
  type SttWorkerResponse,
} from "./stt-messages";

const PARTIAL_INTERVAL_SAMPLES = Math.floor(WHISPER_SAMPLE_RATE * WHISPER_PARTIAL_INTERVAL_SEC);
const MAX_PARTIAL_WINDOW_SAMPLES = Math.floor(WHISPER_SAMPLE_RATE * WHISPER_MAX_PARTIAL_WINDOW_SEC);

env.allowLocalModels = false;
env.useBrowserCache = true;

type WhisperTranscriber = Awaited<ReturnType<typeof pipeline>>;

let transcriber: WhisperTranscriber | null = null;
let initPromise: Promise<WhisperTranscriber> | null = null;
let pendingSamples: Float32Array = new Float32Array(0);
let samplesSinceLastPartial = 0;
let isProcessing = false;

function post(message: SttWorkerResponse) {
  self.postMessage(message);
}

function concatBuffers(a: Float32Array, b: Float32Array): Float32Array {
  if (a.length === 0) return b;
  if (b.length === 0) return a;
  const merged = new Float32Array(a.length + b.length);
  merged.set(a, 0);
  merged.set(b, a.length);
  return merged;
}

function getTranscriptionWindow(allSamples: Float32Array): Float32Array {
  if (allSamples.length <= MAX_PARTIAL_WINDOW_SAMPLES) {
    return allSamples;
  }
  return allSamples.slice(allSamples.length - MAX_PARTIAL_WINDOW_SAMPLES);
}

async function ensureTranscriber(): Promise<WhisperTranscriber> {
  if (transcriber) return transcriber;
  if (!initPromise) {
    initPromise = pipeline("automatic-speech-recognition", WHISPER_MODEL_ID).then((instance) => {
      transcriber = instance;
      return instance;
    });
  }
  return initPromise;
}

async function transcribe(samples: Float32Array): Promise<string> {
  if (samples.length < WHISPER_SAMPLE_RATE * 0.5) return "";
  const model = await ensureTranscriber();
  const result = await model(samples, {
    chunk_length_s: 30,
    stride_length_s: 5,
    language: "english",
    task: "transcribe",
    return_timestamps: false,
  });
  const text =
    typeof result === "object" && result !== null && "text" in result
      ? String((result as { text?: string }).text ?? "")
      : "";
  return text.trim();
}

async function publishPartial() {
  if (isProcessing || pendingSamples.length === 0) return;
  isProcessing = true;
  try {
    const text = await transcribe(getTranscriptionWindow(pendingSamples));
    if (text) {
      post({ type: "partial", text });
    }
    samplesSinceLastPartial = 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Speech transcription failed";
    post({ type: "error", message });
  } finally {
    isProcessing = false;
  }
}

async function flushAll() {
  while (isProcessing) {
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  isProcessing = true;
  try {
    const text = pendingSamples.length > 0 ? await transcribe(pendingSamples) : "";
    pendingSamples = new Float32Array(0);
    samplesSinceLastPartial = 0;
    post({ type: "flushed", text });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Speech transcription failed";
    post({ type: "error", message });
  } finally {
    isProcessing = false;
  }
}

function resetBuffers() {
  pendingSamples = new Float32Array(0);
  samplesSinceLastPartial = 0;
}

self.onmessage = async (event: MessageEvent<SttWorkerRequest>) => {
  const message = event.data;

  try {
    switch (message.type) {
      case "init": {
        post({ type: "loading" });
        await ensureTranscriber();
        resetBuffers();
        post({ type: "ready" });
        break;
      }
      case "audio": {
        pendingSamples = concatBuffers(pendingSamples, message.samples);
        samplesSinceLastPartial += message.samples.length;
        if (samplesSinceLastPartial >= PARTIAL_INTERVAL_SAMPLES) {
          void publishPartial();
        }
        break;
      }
      case "flush": {
        await flushAll();
        break;
      }
      case "reset": {
        resetBuffers();
        break;
      }
      default:
        break;
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Speech worker error";
    post({ type: "error", message: errorMessage });
  }
};
