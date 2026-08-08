import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createMoonshineWorkerClient,
  disposeSharedMoonshineWorkerClient,
  getSharedMoonshineWorkerClient,
  PRELOAD_TIMEOUT_MS,
  TRANSCRIBE_TIMEOUT_MS,
} from "./moonshine-worker-client";

afterEach(() => {
  vi.useRealTimers();
});

describe("createMoonshineWorkerClient", () => {
  it("dedupes preload calls and publishes loading then ready", async () => {
    const worker = createMockWorker();
    const client = createMoonshineWorkerClient(() => worker);
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
    const client = createMoonshineWorkerClient(() => worker);

    const pcm = new Float32Array([0.1, -0.2, 0.3]);
    const result = client.transcribe(pcm, 16_000);
    worker.emit({ type: "result", requestId: "transcribe-1", generation: 0, text: "hello there" });

    await expect(result).resolves.toBe("hello there");
    expect(worker.postMessage).toHaveBeenLastCalledWith(
      expect.objectContaining({ type: "transcribe", requestId: "transcribe-1", sampleRate: 16_000 }),
      expect.any(Array),
    );
  });

  it("drops a late transcribe result after cancel bumps the generation", async () => {
    const worker = createMockWorker();
    const client = createMoonshineWorkerClient(() => worker);

    const result = client.transcribe(new Float32Array([0.5]), 16_000);
    client.cancel();
    worker.emit({ type: "result", requestId: "transcribe-1", generation: 0, text: "stale" });

    await expect(result).rejects.toThrow("cancelled");
  });

  it("cancels an in-flight transcribe when the client is disposed", async () => {
    const worker = createMockWorker();
    const client = createMoonshineWorkerClient(() => worker);
    const result = client.transcribe(new Float32Array([0.1]), 16_000);

    client.dispose();

    // dispose() cancels in-flight transcribes first, so it surfaces as "cancelled".
    await expect(result).rejects.toThrow("cancelled");
  });

  it("rejects a pending preload when the client is disposed", async () => {
    const worker = createMockWorker();
    const client = createMoonshineWorkerClient(() => worker);
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

  it("fails a hung preload and terminates the worker", async () => {
    vi.useFakeTimers();
    const worker = createMockWorker();
    const client = createMoonshineWorkerClient(() => worker);

    const preload = client.preload();
    const rejection = expect(preload).rejects.toThrow("timed out");

    await vi.advanceTimersByTimeAsync(PRELOAD_TIMEOUT_MS);

    await rejection;
    expect(worker.terminate).toHaveBeenCalledTimes(1);
  });

  it("fails a hung transcribe and terminates the worker", async () => {
    vi.useFakeTimers();
    const worker = createMockWorker();
    const client = createMoonshineWorkerClient(() => worker);

    const result = client.transcribe(new Float32Array([0.1]), 16_000);
    const rejection = expect(result).rejects.toThrow("timed out");

    await vi.advanceTimersByTimeAsync(TRANSCRIBE_TIMEOUT_MS);

    await rejection;
    expect(worker.terminate).toHaveBeenCalledTimes(1);
  });

  it("rejects transcribe and reports error status on a worker error message", async () => {
    const worker = createMockWorker();
    const client = createMoonshineWorkerClient(() => worker);
    const statuses: string[] = [];
    client.subscribe((status) => statuses.push(status));

    const result = client.transcribe(new Float32Array([0.1]), 16_000);
    worker.emit({ type: "error", requestId: "transcribe-1", message: "model exploded" });

    await expect(result).rejects.toThrow("model exploded");
    expect(statuses.at(-1)).toBe("error");
  });
});

function createMockWorker() {
  let onMessage: ((event: MessageEvent) => void) | null = null;
  return {
    postMessage: vi.fn(),
    terminate: vi.fn(),
    addEventListener: vi.fn((event: string, listener: (event: MessageEvent) => void) => {
      if (event === "message") onMessage = listener;
    }),
    removeEventListener: vi.fn(),
    emit(message: unknown) {
      onMessage?.({ data: message } as MessageEvent);
    },
  } as unknown as Worker & {
    postMessage: ReturnType<typeof vi.fn>;
    terminate: ReturnType<typeof vi.fn>;
    emit(message: unknown): void;
  };
}
