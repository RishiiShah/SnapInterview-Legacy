// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createMoonshineWorkerClient,
  disposeSharedMoonshineWorkerClient,
  getSharedMoonshineWorkerClient,
  PRELOAD_TIMEOUT_MS,
  TRANSCRIBE_TIMEOUT_MS,
} from "./moonshine-worker-client";

const clients = new Set<ReturnType<typeof createMoonshineWorkerClient>>();

afterEach(() => {
  for (const client of clients) client.dispose();
  clients.clear();
  disposeSharedMoonshineWorkerClient();
  vi.clearAllTimers();
  vi.useRealTimers();
});

function createTestClient(worker: Worker) {
  const client = createMoonshineWorkerClient(() => worker);
  clients.add(client);
  return client;
}

describe("createMoonshineWorkerClient", () => {
  it("dedupes preload calls and publishes loading then ready", async () => {
    const worker = createMockWorker();
    const client = createTestClient(worker);
    const statuses: string[] = [];
    client.subscribe((status) => statuses.push(status));

    const first = client.preload();
    const second = client.preload();

    expect(worker.postMessage).toHaveBeenCalledTimes(1);
    expect(statuses).toContain("loading");

    worker.emit({ type: "ready", requestId: "preload-1" });

    await expect(first).resolves.toBeUndefined();
    await expect(second).resolves.toBeUndefined();
    expect(statuses.at(-1)).toBe("ready");
  });

  it("resolves transcribe with the recognized text", async () => {
    const worker = createMockWorker();
    const client = createTestClient(worker);

    const pcm = new Float32Array([0.1, -0.2, 0.3]);
    const result = client.transcribe(pcm, 16_000);
    worker.emit({ type: "result", requestId: "transcribe-1", generation: 0, text: "hello there" });

    await expect(result).resolves.toBe("hello there");
    expect(worker.postMessage).toHaveBeenLastCalledWith(
      expect.objectContaining({ type: "transcribe", requestId: "transcribe-1", sampleRate: 16_000 }),
      expect.any(Array),
    );
  });

  it("copies PCM into the same buffer passed in the transcribe transfer list", async () => {
    const worker = createMockWorker();
    const client = createTestClient(worker);
    const source = new Float32Array([9, 0.1, -0.2, 0.3, 8]);
    const pcm = source.subarray(1, 4);

    const result = client.transcribe(pcm, 16_000);

    const [message, transfer] = worker.postMessage.mock.calls.at(-1) as [
      { pcm: ArrayBuffer },
      ArrayBuffer[],
    ];
    expect(message.pcm).not.toBe(pcm.buffer);
    expect(Array.from(new Float32Array(message.pcm))).toEqual(Array.from(pcm));
    expect(transfer).toHaveLength(1);
    expect(transfer[0]).toBe(message.pcm);
    worker.emit({ type: "result", requestId: "transcribe-1", generation: 0, text: "done" });
    await expect(result).resolves.toBe("done");
  });

  it("drops a late transcribe result after cancel bumps the generation", async () => {
    const worker = createMockWorker();
    const client = createTestClient(worker);

    const result = client.transcribe(new Float32Array([0.5]), 16_000);
    client.cancel();
    worker.emit({ type: "result", requestId: "transcribe-1", generation: 0, text: "stale" });

    await expect(result).rejects.toThrow("cancelled");
  });

  it("cancels an in-flight transcribe when the client is disposed", async () => {
    const worker = createMockWorker();
    const client = createTestClient(worker);
    const result = client.transcribe(new Float32Array([0.1]), 16_000);

    client.dispose();

    // dispose() cancels in-flight transcribes first, so it surfaces as "cancelled".
    await expect(result).rejects.toThrow("cancelled");
  });

  it("rejects a pending preload when the client is disposed", async () => {
    const worker = createMockWorker();
    const client = createTestClient(worker);
    const preload = client.preload();

    client.dispose();

    await expect(preload).rejects.toThrow("disposed");
  });

  it("reuses one shared client across hook mounts", () => {
    const worker = createMockWorker();
    const first = getSharedMoonshineWorkerClient(() => worker);
    const second = getSharedMoonshineWorkerClient(() => worker);

    expect(second).toBe(first);
    disposeSharedMoonshineWorkerClient();
  });

  it("disposes the shared client when the page is hidden", async () => {
    const worker = createMockWorker();
    const client = getSharedMoonshineWorkerClient(() => worker);
    const preload = client.preload();
    const rejection = expect(preload).rejects.toThrow("disposed");

    window.dispatchEvent(new Event("pagehide"));

    await rejection;
    expect(worker.terminate).toHaveBeenCalledOnce();
  });

  it("fails a hung preload and terminates the worker", async () => {
    vi.useFakeTimers();
    const worker = createMockWorker();
    const client = createTestClient(worker);

    const preload = client.preload();
    const rejection = expect(preload).rejects.toThrow("timed out");

    await vi.advanceTimersByTimeAsync(PRELOAD_TIMEOUT_MS);

    await rejection;
    expect(worker.terminate).toHaveBeenCalledTimes(1);
  });

  it("fails a hung transcribe and terminates the worker", async () => {
    vi.useFakeTimers();
    const worker = createMockWorker();
    const client = createTestClient(worker);

    const result = client.transcribe(new Float32Array([0.1]), 16_000);
    const rejection = expect(result).rejects.toThrow("timed out");

    await vi.advanceTimersByTimeAsync(TRANSCRIBE_TIMEOUT_MS);

    await rejection;
    expect(worker.terminate).toHaveBeenCalledTimes(1);
  });

  it("terminates and ignores late results after transcription timeout", async () => {
    vi.useFakeTimers();
    const worker = createMockWorker();
    const client = createTestClient(worker);
    const result = client.transcribe(new Float32Array([0.25]), 16_000);
    const rejection = expect(result).rejects.toThrow(
      `STT transcription timed out after ${TRANSCRIBE_TIMEOUT_MS}ms`,
    );

    await vi.advanceTimersByTimeAsync(TRANSCRIBE_TIMEOUT_MS);
    await rejection;
    expect(worker.terminate).toHaveBeenCalledOnce();
    worker.emit({ type: "result", requestId: "transcribe-1", generation: 0, text: "late" });
  });

  it("rejects transcribe and reports error status on a worker error message", async () => {
    const worker = createMockWorker();
    const client = createTestClient(worker);
    const statuses: string[] = [];
    client.subscribe((status) => statuses.push(status));

    const result = client.transcribe(new Float32Array([0.1]), 16_000);
    worker.emit({ type: "error", requestId: "transcribe-1", message: "model exploded" });

    await expect(result).rejects.toThrow("model exploded");
    expect(statuses.at(-1)).toBe("error");
  });

  it("rejects and terminates on a native worker error event", async () => {
    const worker = createMockWorker();
    const client = createTestClient(worker);
    const statuses: string[] = [];
    client.subscribe((status) => statuses.push(status));

    const result = client.transcribe(new Float32Array([0.1]), 16_000);
    const rejection = expect(result).rejects.toThrow("native worker exploded");
    worker.emitError("native worker exploded");

    await rejection;
    expect(statuses.at(-1)).toBe("error");
    expect(worker.terminate).toHaveBeenCalledOnce();
  });
});

function createMockWorker() {
  return new FakeWorker() as unknown as Worker & {
    postMessage: ReturnType<typeof vi.fn>;
    terminate: ReturnType<typeof vi.fn>;
    emit(message: unknown): void;
    emitError(message: string): void;
  };
}

class FakeWorker {
  readonly postMessage = vi.fn();
  readonly terminate = vi.fn();
  private messageListener: ((event: Event) => void) | null = null;
  private errorListener: ((event: Event) => void) | null = null;

  addEventListener(event: string, listener: EventListenerOrEventListenerObject) {
    if (typeof listener !== "function") return;
    if (event === "message") this.messageListener = listener;
    if (event === "error") this.errorListener = listener;
  }

  removeEventListener(event: string) {
    if (event === "message") this.messageListener = null;
    if (event === "error") this.errorListener = null;
  }

  emit(message: unknown) {
    this.messageListener?.(new MessageEvent("message", { data: message }));
  }

  emitError(message: string) {
    this.errorListener?.(new ErrorEvent("error", { message }));
  }
}
