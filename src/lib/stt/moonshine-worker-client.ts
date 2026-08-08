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

type PendingRequest = {
  kind: "preload" | "transcribe";
  generation: number;
  resolve: (text: string) => void;
  reject: (error: Error) => void;
  timeout?: ReturnType<typeof setTimeout>;
};

export function createMoonshineWorkerClient(
  createWorker: WorkerFactory = () =>
    new Worker(new URL("./moonshine.worker.ts", import.meta.url), { type: "module" }),
): MoonshineClient {
  let worker: Worker | null = null;
  let requestNumber = 0;
  let generation = 0;
  let status: SttWorkerStatus = "idle";
  let preloadPromise: Promise<void> | null = null;
  let preloadTimeout: ReturnType<typeof setTimeout> | null = null;
  const listeners = new Set<(next: SttWorkerStatus) => void>();
  const pending = new Map<string, PendingRequest>();

  const setStatus = (next: SttWorkerStatus) => {
    status = next;
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

  function onMessage(event: MessageEvent<SttWorkerResponse>) {
    const message = event.data;

    if (message.type === "ready") {
      setStatus("ready");
      const request = pending.get(message.requestId);
      if (request) {
        pending.delete(message.requestId);
        clearRequestTimeout(request);
        request.resolve("");
      }
      return;
    }

    if (message.type === "result") {
      const request = pending.get(message.requestId);
      if (!request) return;
      pending.delete(message.requestId);
      clearRequestTimeout(request);
      if (request.generation !== generation || message.generation !== generation) {
        request.reject(new Error("Transcription request cancelled"));
        return;
      }
      request.resolve(message.text);
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
    rejectPendingRequests(new Error(event.message || "STT worker failed"));
    terminateWorker();
  }

  const nextRequestId = (prefix: "preload" | "transcribe") => `${prefix}-${++requestNumber}`;

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
        request.reject(new Error(`STT model preload timed out after ${PRELOAD_TIMEOUT_MS}ms`));
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

  const transcribe = (pcm: Float32Array, sampleRate: number) => {
    const requestId = nextRequestId("transcribe");
    const requestGeneration = generation;
    return new Promise<string>((resolve, reject) => {
      const request: PendingRequest = {
        kind: "transcribe",
        generation: requestGeneration,
        resolve,
        reject,
      };
      request.timeout = setTimeout(() => {
        if (pending.get(requestId) !== request) return;
        pending.delete(requestId);
        generation += 1;
        clearRequestTimeout(request);
        request.reject(new Error(`STT transcription timed out after ${TRANSCRIBE_TIMEOUT_MS}ms`));
        clearPreloadTimeout();
        rejectPendingRequests(new Error("STT worker reset after transcription timeout"));
        setStatus("error");
        terminateWorker();
      }, TRANSCRIBE_TIMEOUT_MS);
      pending.set(requestId, request);
      const buffer = pcm.slice().buffer;
      ensureWorker().postMessage(
        { type: "transcribe", requestId, generation: requestGeneration, pcm: buffer, sampleRate },
        [buffer],
      );
    });
  };

  const cancel = () => {
    generation += 1;
    for (const [requestId, request] of pending) {
      if (request.kind !== "transcribe") continue;
      pending.delete(requestId);
      clearRequestTimeout(request);
      request.reject(new Error("Transcription request cancelled"));
    }
    worker?.postMessage({ type: "cancel", generation });
  };

  const dispose = () => {
    cancel();
    clearPreloadTimeout();
    for (const [requestId, request] of pending) {
      pending.delete(requestId);
      request.reject(new Error("STT client disposed"));
    }
    terminateWorker();
    preloadPromise = null;
    listeners.clear();
  };

  return {
    preload,
    transcribe,
    cancel,
    dispose,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
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
