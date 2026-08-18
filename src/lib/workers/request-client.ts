export type WorkerClientEvent<TResult> =
  | { type: "ready"; requestId: string }
  | { type: "result"; requestId: string; generation: number; value: TResult }
  | { type: "error"; requestId?: string; message: string };

export type WorkerRequestSpec<TResult, TKind extends string> = {
  kind: TKind;
  requestIdPrefix: string;
  timeoutMs: number;
  timeoutMessage: string;
  resetMessage: string;
  cancelledMessage: string;
  post: (worker: Worker, requestId: string, generation: number) => void;
};

export type WorkerRequestClientOptions<TStatus, TKind extends string, TResult> = {
  createWorker: () => Worker;
  decodeMessage: (data: unknown) => WorkerClientEvent<TResult>;
  statuses: { idle: TStatus; loading: TStatus; ready: TStatus; error: TStatus };
  workerErrorMessage: string;
  disposedMessage: string;
  preload: {
    timeoutMs: number;
    timeoutMessage: string;
    post: (worker: Worker, requestId: string) => void;
  };
};

type PendingRequest<TResult, TKind extends string> = {
  kind: TKind;
  generation: number;
  resetMessage: string;
  cancelledMessage: string;
  timeout: ReturnType<typeof setTimeout>;
  resolve: (result: TResult) => void;
  reject: (error: Error) => void;
};

type PendingPreload = {
  requestId: string;
  timeout: ReturnType<typeof setTimeout>;
  resolve: () => void;
  reject: (error: Error) => void;
};

export function createWorkerRequestClient<TStatus, TKind extends string, TResult>(
  options: WorkerRequestClientOptions<TStatus, TKind, TResult>,
): {
  preload(): Promise<void>;
  request(spec: WorkerRequestSpec<TResult, TKind>): Promise<TResult>;
  cancel(
    kind: TKind,
    message: string,
    post: (worker: Worker, generation: number) => void,
  ): void;
  dispose(cancel: () => void): void;
  subscribe(listener: (status: TStatus) => void): () => void;
} {
  let worker: Worker | null = null;
  let requestNumber = 0;
  let status = options.statuses.idle;
  let preloadPromise: Promise<void> | null = null;
  let pendingPreload: PendingPreload | null = null;
  let disposing = false;
  let disposed = false;
  const generations = new Map<TKind, number>();
  const pending = new Map<string, PendingRequest<TResult, TKind>>();
  const listeners = new Set<(status: TStatus) => void>();

  const setStatus = (nextStatus: TStatus) => {
    status = nextStatus;
    for (const listener of listeners) listener(status);
  };

  const nextRequestId = (prefix: string) => `${prefix}-${++requestNumber}`;

  const currentGeneration = (kind: TKind) => generations.get(kind) ?? 0;

  const incrementGeneration = (kind: TKind) => {
    const nextGeneration = currentGeneration(kind) + 1;
    generations.set(kind, nextGeneration);
    return nextGeneration;
  };

  const incrementAllGenerations = () => {
    for (const kind of generations.keys()) incrementGeneration(kind);
  };

  const terminateWorker = () => {
    if (!worker) return;
    const currentWorker = worker;
    worker = null;
    currentWorker.removeEventListener("message", onMessage);
    currentWorker.removeEventListener("error", onWorkerError);
    currentWorker.terminate();
  };

  const ensureWorker = () => {
    if (worker) return worker;
    const nextWorker = options.createWorker();
    generations.clear();
    nextWorker.addEventListener("message", onMessage);
    nextWorker.addEventListener("error", onWorkerError);
    worker = nextWorker;
    return nextWorker;
  };

  const rejectPreload = (error: Error) => {
    const preload = pendingPreload;
    pendingPreload = null;
    preloadPromise = null;
    if (!preload) return;
    clearTimeout(preload.timeout);
    preload.reject(error);
  };

  const resolvePreload = (requestId: string) => {
    const preload = pendingPreload;
    if (!preload || preload.requestId !== requestId) return;
    pendingPreload = null;
    clearTimeout(preload.timeout);
    preload.resolve();
  };

  const rejectRequest = (requestId: string, request: PendingRequest<TResult, TKind>, error: Error) => {
    if (pending.get(requestId) !== request) return;
    pending.delete(requestId);
    clearTimeout(request.timeout);
    request.reject(error);
  };

  const rejectRequests = (errorFor: (request: PendingRequest<TResult, TKind>) => Error) => {
    for (const [requestId, request] of pending) {
      rejectRequest(requestId, request, errorFor(request));
    }
  };

  const resetAll = (error: Error) => {
    incrementAllGenerations();
    rejectPreload(error);
    rejectRequests(() => error);
    setStatus(options.statuses.error);
    terminateWorker();
  };

  function onMessage(event: MessageEvent<unknown>) {
    const message = options.decodeMessage(event.data);

    if (message.type === "ready") {
      if (pendingPreload?.requestId !== message.requestId) return;
      resolvePreload(message.requestId);
      setStatus(options.statuses.ready);
      return;
    }

    if (message.type === "result") {
      const request = pending.get(message.requestId);
      if (!request) return;
      if (
        request.generation !== currentGeneration(request.kind) ||
        message.generation !== request.generation
      ) {
        rejectRequest(message.requestId, request, new Error(request.cancelledMessage));
        return;
      }
      pending.delete(message.requestId);
      clearTimeout(request.timeout);
      request.resolve(message.value);
      return;
    }

    if (message.requestId) {
      if (pendingPreload?.requestId === message.requestId) {
        rejectPreload(new Error(message.message));
      } else {
        const request = pending.get(message.requestId);
        if (request) rejectRequest(message.requestId, request, new Error(message.message));
      }
      setStatus(options.statuses.error);
      return;
    }

    resetAll(new Error(message.message));
  }

  function onWorkerError(event: ErrorEvent) {
    resetAll(new Error(event.message || options.workerErrorMessage));
  }

  const preload = () => {
    if (disposed || disposing) return Promise.reject(new Error(options.disposedMessage));
    if (status === options.statuses.ready) return Promise.resolve();
    if (preloadPromise) return preloadPromise;

    const requestId = nextRequestId("preload");
    setStatus(options.statuses.loading);
    let resolvePromise!: () => void;
    let rejectPromise!: (error: Error) => void;
    const promise = new Promise<void>((resolve, reject) => {
      resolvePromise = resolve;
      rejectPromise = reject;
    });
    preloadPromise = promise;
    const preloadRequest: PendingPreload = {
      requestId,
      resolve: resolvePromise,
      reject: rejectPromise,
      timeout: setTimeout(() => {
        if (pendingPreload !== preloadRequest) return;
        resetAll(new Error(options.preload.timeoutMessage));
      }, options.preload.timeoutMs),
    };
    pendingPreload = preloadRequest;

    try {
      options.preload.post(ensureWorker(), requestId);
    } catch (error) {
      resetAll(error instanceof Error ? error : new Error(String(error)));
    }
    return promise;
  };

  const request = (spec: WorkerRequestSpec<TResult, TKind>) => {
    if (disposed || disposing) return Promise.reject<TResult>(new Error(options.disposedMessage));

    const requestId = nextRequestId(spec.requestIdPrefix);
    let activeWorker: Worker;
    try {
      activeWorker = ensureWorker();
    } catch (error) {
      const workerError = error instanceof Error ? error : new Error(String(error));
      resetAll(workerError);
      return Promise.reject<TResult>(workerError);
    }
    const requestGeneration = currentGeneration(spec.kind);
    generations.set(spec.kind, requestGeneration);
    return new Promise<TResult>((resolve, reject) => {
      const pendingRequest: PendingRequest<TResult, TKind> = {
        kind: spec.kind,
        generation: requestGeneration,
        resetMessage: spec.resetMessage,
        cancelledMessage: spec.cancelledMessage,
        resolve,
        reject,
        timeout: setTimeout(() => {
          if (pending.get(requestId) !== pendingRequest) return;
          pending.delete(requestId);
          clearTimeout(pendingRequest.timeout);
          pendingRequest.reject(new Error(spec.timeoutMessage));
          incrementAllGenerations();
          rejectPreload(new Error(spec.resetMessage));
          rejectRequests(() => new Error(spec.resetMessage));
          setStatus(options.statuses.error);
          terminateWorker();
        }, spec.timeoutMs),
      };
      pending.set(requestId, pendingRequest);

      try {
        spec.post(activeWorker, requestId, requestGeneration);
      } catch (error) {
        resetAll(error instanceof Error ? error : new Error(String(error)));
      }
    });
  };

  const cancel = (
    kind: TKind,
    message: string,
    post: (worker: Worker, generation: number) => void,
  ) => {
    if (disposed) return;
    const nextGeneration = incrementGeneration(kind);
    for (const [requestId, request] of pending) {
      if (request.kind === kind) rejectRequest(requestId, request, new Error(message));
    }
    if (!worker) return;
    try {
      post(worker, nextGeneration);
    } catch (error) {
      resetAll(error instanceof Error ? error : new Error(String(error)));
    }
  };

  const dispose = (cancelWork: () => void) => {
    if (disposed || disposing) return;
    disposing = true;
    try {
      cancelWork();
    } finally {
      rejectPreload(new Error(options.disposedMessage));
      rejectRequests(() => new Error(options.disposedMessage));
      terminateWorker();
      listeners.clear();
      preloadPromise = null;
      disposed = true;
      disposing = false;
    }
  };

  return {
    preload,
    request,
    cancel,
    dispose,
    subscribe(listener) {
      if (!disposed && !disposing) listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
