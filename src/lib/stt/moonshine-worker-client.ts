import {
  createWorkerRequestClient,
  type WorkerClientEvent,
} from "../workers/request-client";
import type { SttWorkerResponse, SttWorkerStatus } from "./stt-messages";

export const PRELOAD_TIMEOUT_MS = 60_000;
export const TRANSCRIBE_TIMEOUT_MS = 30_000;

export type MoonshineClient = {
  preload: () => Promise<void>;
  transcribe: (pcm: Float32Array, sampleRate: number) => Promise<string>;
  cancel: () => void;
  dispose: () => void;
  subscribe: (listener: (status: SttWorkerStatus) => void) => () => void;
};

export type WorkerFactory = () => Worker;

type RequestKind = "transcribe";

function decodeWorkerMessage(data: unknown): WorkerClientEvent<string> {
  const message = data as SttWorkerResponse;
  if (message.type === "ready") {
    return { type: "ready", requestId: message.requestId };
  }
  if (message.type === "result") {
    return {
      type: "result",
      requestId: message.requestId,
      generation: message.generation,
      value: message.text,
    };
  }
  return { type: "error", requestId: message.requestId, message: message.message };
}

export function createMoonshineWorkerClient(
  createWorker: WorkerFactory = () =>
    new Worker(new URL("./moonshine.worker.ts", import.meta.url), { type: "module" }),
): MoonshineClient {
  const client = createWorkerRequestClient<SttWorkerStatus, RequestKind, string>({
    createWorker,
    decodeMessage: decodeWorkerMessage,
    statuses: { idle: "idle", loading: "loading", ready: "ready", error: "error" },
    workerErrorMessage: "STT worker failed",
    disposedMessage: "STT client disposed",
    preload: {
      timeoutMs: PRELOAD_TIMEOUT_MS,
      timeoutMessage: `STT model preload timed out after ${PRELOAD_TIMEOUT_MS}ms`,
      post(worker, requestId) {
        worker.postMessage({ type: "preload", requestId });
      },
    },
  });

  const transcribe = (pcm: Float32Array, sampleRate: number) =>
    client.request({
      kind: "transcribe",
      requestIdPrefix: "transcribe",
      timeoutMs: TRANSCRIBE_TIMEOUT_MS,
      timeoutMessage: `STT transcription timed out after ${TRANSCRIBE_TIMEOUT_MS}ms`,
      resetMessage: "STT worker reset after transcription timeout",
      cancelledMessage: "Transcription request cancelled",
      post(worker, requestId, generation) {
        const buffer = pcm.slice().buffer;
        worker.postMessage(
          { type: "transcribe", requestId, generation, pcm: buffer, sampleRate },
          [buffer],
        );
      },
    });

  const cancel = () =>
    client.cancel("transcribe", "Transcription request cancelled", (worker, generation) => {
      worker.postMessage({ type: "cancel", generation });
    });

  const dispose = () => client.dispose(cancel);

  return {
    preload: client.preload,
    transcribe,
    cancel,
    dispose,
    subscribe: client.subscribe,
  };
}

let sharedClient: MoonshineClient | null = null;
let pagehideBound = false;

export function getSharedMoonshineWorkerClient(createWorker?: WorkerFactory): MoonshineClient {
  if (!sharedClient) {
    sharedClient = createMoonshineWorkerClient(createWorker);
    if (typeof window !== "undefined" && !pagehideBound) {
      window.addEventListener("pagehide", disposeSharedMoonshineWorkerClient);
      pagehideBound = true;
    }
  }
  return sharedClient;
}

export function disposeSharedMoonshineWorkerClient() {
  sharedClient?.dispose();
  sharedClient = null;
  if (typeof window !== "undefined" && pagehideBound) {
    window.removeEventListener("pagehide", disposeSharedMoonshineWorkerClient);
    pagehideBound = false;
  }
}
