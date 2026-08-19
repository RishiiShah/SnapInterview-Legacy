import type {
  BrowserTtsAudio,
  BrowserTtsEngine,
  BrowserTtsStatus,
} from "./browser-tts";
import { resolveKokoroVoice } from "./browser-tts";
import {
  createWorkerRequestClient,
  type WorkerClientEvent,
} from "../workers/request-client";

export const PRELOAD_TIMEOUT_MS = 30_000;
export const SYNTH_TIMEOUT_MS = 20_000;

type WorkerMessage =
  | { type: "ready"; requestId: string; status: "ready" }
  | { type: "audio"; requestId: string; generation: number; pcm: ArrayBuffer; sampleRate: number }
  | { type: "error"; requestId?: string; message: string };

export type WorkerFactory = () => Worker;

type RequestKind = "synth";

function decodeWorkerMessage(data: unknown): WorkerClientEvent<BrowserTtsAudio> {
  const message = data as WorkerMessage;
  if (message.type === "ready") {
    return { type: "ready", requestId: message.requestId };
  }
  if (message.type === "audio") {
    return {
      type: "result",
      requestId: message.requestId,
      generation: message.generation,
      value: {
        pcm: new Float32Array(message.pcm),
        sampleRate: message.sampleRate,
      },
    };
  }
  return { type: "error", requestId: message.requestId, message: message.message };
}

export function createKokoroWorkerClient(
  createWorker: WorkerFactory = () =>
    new Worker(new URL("./kokoro.worker.ts", import.meta.url), { type: "module" }),
): BrowserTtsEngine {
  const client = createWorkerRequestClient<BrowserTtsStatus, RequestKind, BrowserTtsAudio>({
    createWorker,
    decodeMessage: decodeWorkerMessage,
    statuses: { idle: "idle", loading: "loading", ready: "ready", error: "error" },
    workerErrorMessage: "Browser TTS worker failed",
    disposedMessage: "TTS client disposed",
    preload: {
      timeoutMs: PRELOAD_TIMEOUT_MS,
      timeoutMessage: `Browser TTS model preload timed out after ${PRELOAD_TIMEOUT_MS}ms`,
      post(worker, requestId) {
        worker.postMessage({ type: "preload", requestId });
      },
    },
  });

  const synthesize = (text: string, options?: { persona?: string | null }) =>
    client.request({
      kind: "synth",
      requestIdPrefix: "synth",
      timeoutMs: SYNTH_TIMEOUT_MS,
      timeoutMessage: `Browser TTS synthesis timed out after ${SYNTH_TIMEOUT_MS}ms`,
      resetMessage: "Browser TTS worker reset after synthesis timeout",
      cancelledMessage: "TTS request cancelled",
      post(worker, requestId, generation) {
        worker.postMessage({
          type: "synthesize",
          requestId,
          generation,
          text,
          voice: resolveKokoroVoice(options?.persona),
        });
      },
    });

  const cancel = () =>
    client.cancel("synth", "TTS request cancelled", (worker, generation) => {
      worker.postMessage({ type: "cancel", generation });
    });

  const dispose = () => client.dispose(cancel);

  return {
    preload: client.preload,
    synthesize,
    cancel,
    dispose,
    subscribe: client.subscribe,
  };
}

let sharedClient: BrowserTtsEngine | null = null;
let pagehideBound = false;

export function getSharedKokoroWorkerClient(createWorker?: WorkerFactory): BrowserTtsEngine {
  if (!sharedClient) {
    sharedClient = createKokoroWorkerClient(createWorker);
    if (typeof window !== "undefined" && !pagehideBound) {
      window.addEventListener("pagehide", disposeSharedKokoroWorkerClient);
      pagehideBound = true;
    }
  }
  return sharedClient;
}

export function disposeSharedKokoroWorkerClient() {
  sharedClient?.dispose();
  sharedClient = null;
  if (typeof window !== "undefined" && pagehideBound) {
    window.removeEventListener("pagehide", disposeSharedKokoroWorkerClient);
    pagehideBound = false;
  }
}
