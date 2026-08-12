import type {
  BrowserTtsAudio,
  BrowserTtsEngine,
  BrowserTtsStatus,
} from "./browser-tts";
import { resolveKokoroVoice } from "./browser-tts";

export const PRELOAD_TIMEOUT_MS = 30_000;
export const SYNTH_TIMEOUT_MS = 20_000;

type WorkerMessage =
  | { type: "ready"; requestId: string; status: "ready" }
  | { type: "audio"; requestId: string; generation: number; pcm: ArrayBuffer; sampleRate: number }
  | { type: "error"; requestId?: string; message: string };

export type WorkerFactory = () => Worker;

type PendingRequest = {
  kind: "preload" | "synth";
  generation: number;
  resolve: (audio: BrowserTtsAudio) => void;
  reject: (error: Error) => void;
  timeout?: ReturnType<typeof setTimeout>;
};

export function createKokoroWorkerClient(
  createWorker: WorkerFactory = () =>
    new Worker(new URL("./kokoro.worker.ts", import.meta.url), { type: "module" }),
): BrowserTtsEngine {
  let worker: Worker | null = null;
  let requestNumber = 0;
  let generation = 0;
  let status: BrowserTtsStatus = "idle";
  let preloadPromise: Promise<void> | null = null;
  let preloadTimeout: ReturnType<typeof setTimeout> | null = null;
  const listeners = new Set<(nextStatus: BrowserTtsStatus) => void>();
  const pending = new Map<string, PendingRequest>();

  const setStatus = (nextStatus: BrowserTtsStatus) => {
    status = nextStatus;
    for (const listener of listeners) listener(status);
  };

  const ensureWorker = () => {
    if (worker) return worker;
    worker = createWorker();
    worker.addEventListener("message", onMessage);
    worker.addEventListener("error", onWorkerError);
    return worker;
  };

  const clearPreloadTimeout = () => {
    if (preloadTimeout !== null) {
      clearTimeout(preloadTimeout);
      preloadTimeout = null;
    }
  };

  const clearRequestTimeout = (request: PendingRequest) => {
    if (request.timeout !== undefined) clearTimeout(request.timeout);
  };

  const rejectPendingRequests = (error: Error) => {
    for (const [requestId, request] of pending) {
      pending.delete(requestId);
      clearRequestTimeout(request);
      request.reject(error);
    }
  };

  const terminateWorker = () => {
    if (!worker) return;
    worker.removeEventListener("message", onMessage);
    worker.removeEventListener("error", onWorkerError);
    worker.terminate();
    worker = null;
  };

  function onMessage(event: MessageEvent<WorkerMessage>) {
    const message = event.data;
    if (message.type === "ready") {
      setStatus("ready");
      const request = pending.get(message.requestId);
      if (request) {
        pending.delete(message.requestId);
        clearRequestTimeout(request);
        request.resolve({ pcm: new Float32Array(), sampleRate: 24_000 });
      }
      return;
    }

    if (message.type === "audio") {
      const request = pending.get(message.requestId);
      if (!request) return;
      pending.delete(message.requestId);
      clearRequestTimeout(request);
      if (request.generation !== generation || message.generation !== generation) {
        request.reject(new Error("TTS request cancelled"));
        return;
      }
      request.resolve({ pcm: new Float32Array(message.pcm), sampleRate: message.sampleRate });
      return;
    }

    if (message.type === "error") {
      const request = message.requestId ? pending.get(message.requestId) : null;
      if (request && message.requestId) {
        pending.delete(message.requestId);
        clearRequestTimeout(request);
        request.reject(new Error(message.message));
      }
      setStatus("error");
    }
  }

  function onWorkerError(event: ErrorEvent) {
    setStatus("error");
    const error = new Error(event.message || "Browser TTS worker failed");
    rejectPendingRequests(error);
    terminateWorker();
  }

  const nextRequestId = (prefix: "preload" | "synth") => `${prefix}-${++requestNumber}`;

  const preload = () => {
    if (status === "ready") return Promise.resolve();
    if (preloadPromise) return preloadPromise;

    const requestId = nextRequestId("preload");
    setStatus("loading");
    preloadPromise = new Promise<void>((resolve, reject) => {
      pending.set(requestId, {
        kind: "preload",
        generation,
        resolve: () => {
          clearPreloadTimeout();
          resolve();
        },
        reject: (error) => {
          clearPreloadTimeout();
          preloadPromise = null;
          reject(error);
        },
      });
      preloadTimeout = setTimeout(() => {
        const request = pending.get(requestId);
        if (!request) return;
        pending.delete(requestId);
        request.reject(new Error(`Browser TTS model preload timed out after ${PRELOAD_TIMEOUT_MS}ms`));
        setStatus("error");
        terminateWorker();
      }, PRELOAD_TIMEOUT_MS);
      ensureWorker().postMessage({ type: "preload", requestId });
    }).catch((error) => {
      clearPreloadTimeout();
      setStatus("error");
      throw error;
    });
    return preloadPromise;
  };

  const synthesize = (text: string, options?: { persona?: string | null }) => {
    const requestId = nextRequestId("synth");
    const requestGeneration = generation;
    return new Promise<BrowserTtsAudio>((resolve, reject) => {
      const request: PendingRequest = {
        kind: "synth",
        generation: requestGeneration,
        resolve,
        reject,
      };
      request.timeout = setTimeout(() => {
        if (pending.get(requestId) !== request) return;
        pending.delete(requestId);
        generation += 1;
        clearRequestTimeout(request);
        request.reject(new Error(`Browser TTS synthesis timed out after ${SYNTH_TIMEOUT_MS}ms`));
        clearPreloadTimeout();
        rejectPendingRequests(new Error("Browser TTS worker reset after synthesis timeout"));
        setStatus("error");
        terminateWorker();
      }, SYNTH_TIMEOUT_MS);
      pending.set(requestId, request);
      ensureWorker().postMessage({
        type: "synthesize",
        requestId,
        generation: requestGeneration,
        text,
        voice: resolveKokoroVoice(options?.persona),
      });
    });
  };

  const cancel = () => {
    generation += 1;
    for (const [requestId, request] of pending) {
      if (request.kind !== "synth") continue;
      pending.delete(requestId);
      clearRequestTimeout(request);
      request.reject(new Error("TTS request cancelled"));
    }
    worker?.postMessage({ type: "cancel", generation });
  };

  const dispose = () => {
    cancel();
    clearPreloadTimeout();
    for (const [requestId, request] of pending) {
      pending.delete(requestId);
      request.reject(new Error("TTS client disposed"));
    }
    terminateWorker();
    preloadPromise = null;
    listeners.clear();
  };

  return {
    preload,
    synthesize,
    cancel,
    dispose,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
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
