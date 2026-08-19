// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createAudioBufferFromPcm,
  isLocalTtsEnabled,
  mergePendingTtsText,
  resolveKokoroVoice,
  splitTtsText,
} from "./browser-tts";
import {
  createKokoroWorkerClient,
  disposeSharedKokoroWorkerClient,
  getSharedKokoroWorkerClient,
  PRELOAD_TIMEOUT_MS,
  SYNTH_TIMEOUT_MS,
} from "./kokoro-worker-client";

const clients = new Set<ReturnType<typeof createKokoroWorkerClient>>();

afterEach(() => {
  for (const client of clients) client.dispose();
  clients.clear();
  disposeSharedKokoroWorkerClient();
  vi.clearAllTimers();
  vi.useRealTimers();
});

function createTestClient(createWorker: () => Worker) {
  const client = createKokoroWorkerClient(createWorker);
  clients.add(client);
  return client;
}

describe("browser TTS helpers", () => {
  it("bounds merged pending speech while keeping the newest text", () => {
    const merged = mergePendingTtsText("a".repeat(5_900), "latest sentence");

    expect(merged.length).toBeLessThanOrEqual(6_000);
    expect(merged).toContain("latest sentence");
  });

  it("splits long utterances at sentence boundaries and hard-caps fragments", () => {
    const chunks = splitTtsText("First sentence. Second sentence. Third sentence.", 20);

    expect(chunks).toEqual(["First sentence.", "Second sentence.", "Third sentence."]);
    expect(chunks.every((chunk) => chunk.length <= 20)).toBe(true);
  });

  it("hard-caps an utterance with no sentence boundary", () => {
    const chunks = splitTtsText("a".repeat(25), 10);

    expect(chunks).toEqual(["a".repeat(10), "a".repeat(10), "a".repeat(5)]);
  });

  it.each([
    ["friendly", "af_bella"],
    ["balanced", "af_sarah"],
    ["strict", "am_michael"],
    [null, "af_sarah"],
    ["unknown", "af_sarah"],
  ])("maps persona %s to Kokoro voice %s", (persona, voice) => {
    expect(resolveKokoroVoice(persona)).toBe(voice);
  });

  it("enables local TTS unless the public rollback flag is exactly false", () => {
    expect(isLocalTtsEnabled(undefined)).toBe(true);
    expect(isLocalTtsEnabled("")).toBe(true);
    expect(isLocalTtsEnabled("true")).toBe(true);
    expect(isLocalTtsEnabled("false")).toBe(false);
  });

  it("converts Float32 PCM directly into a mono AudioBuffer", () => {
    const copyToChannel = vi.fn();
    const audioContext = {
      createBuffer: vi.fn(() => ({ copyToChannel })),
    } as unknown as AudioContext;
    const pcm = new Float32Array([0.1, -0.2, 0.3]);

    const buffer = createAudioBufferFromPcm(audioContext, { pcm, sampleRate: 24_000 });

    expect(buffer).toBeDefined();
    expect(audioContext.createBuffer).toHaveBeenCalledWith(1, 3, 24_000);
    expect(copyToChannel).toHaveBeenCalledWith(pcm, 0);
  });
});

describe("createKokoroWorkerClient", () => {
  it("dedupes preload calls and publishes loading then ready", async () => {
    const worker = createMockWorker();
    const client = createTestClient(() => worker);
    const statuses: string[] = [];
    client.subscribe((status) => statuses.push(status));

    const first = client.preload();
    const second = client.preload();

    expect(worker.postMessage).toHaveBeenCalledTimes(1);
    expect(statuses).toContain("loading");

    worker.emit({ type: "ready", requestId: "preload-1", status: "ready" });

    await expect(first).resolves.toBeUndefined();
    await expect(second).resolves.toBeUndefined();
    expect(statuses.at(-1)).toBe("ready");
  });

  it("keeps model preload alive when speech cancellation occurs", async () => {
    const worker = createMockWorker();
    const client = createTestClient(() => worker);
    const preload = client.preload();

    client.cancel();
    worker.emit({ type: "ready", requestId: "preload-1", status: "ready" });

    await expect(preload).resolves.toBeUndefined();
  });

  it("rejects pending preload when the client is disposed", async () => {
    const worker = createMockWorker();
    const client = createTestClient(() => worker);
    const preload = client.preload();

    client.dispose();

    await expect(preload).rejects.toThrow("disposed");
  });

  it("reuses one shared client across hook mounts", () => {
    const worker = createMockWorker();

    const first = getSharedKokoroWorkerClient(() => worker);
    const second = getSharedKokoroWorkerClient(() => worker);

    expect(second).toBe(first);
    disposeSharedKokoroWorkerClient();
  });

  it("disposes the shared client when the page is hidden", async () => {
    const worker = createMockWorker();
    const client = getSharedKokoroWorkerClient(() => worker);
    const preload = client.preload();
    const rejection = expect(preload).rejects.toThrow("disposed");

    window.dispatchEvent(new Event("pagehide"));

    await rejection;
    expect(worker.terminate).toHaveBeenCalledOnce();
  });

  it("ignores late synth responses after cancellation generation changes", async () => {
    const worker = createMockWorker();
    const client = createTestClient(() => worker);

    const synth = client.synthesize("Hello", { persona: "friendly" });
    client.cancel();

    worker.emit({
      type: "audio",
      requestId: "synth-1",
      generation: 0,
      pcm: new Float32Array([0.5]).buffer,
      sampleRate: 24_000,
    });

    await expect(synth).rejects.toThrow("cancelled");
  });

  it("keeps one worker instance for preload and synthesize", async () => {
    const worker = createMockWorker();
    const createWorker = vi.fn(() => worker);
    const client = createTestClient(createWorker);

    const preload = client.preload();
    worker.emit({ type: "ready", requestId: "preload-1", status: "ready" });
    await preload;

    const synth = client.synthesize("Hello", { persona: "strict" });
    worker.emit({
      type: "audio",
      requestId: "synth-2",
      generation: 0,
      pcm: new Float32Array([0.25, -0.25]).buffer,
      sampleRate: 24_000,
    });

    await expect(synth).resolves.toMatchObject({ sampleRate: 24_000 });
    expect(createWorker).toHaveBeenCalledTimes(1);
    expect(worker.postMessage).toHaveBeenLastCalledWith({
      type: "synthesize",
      requestId: "synth-2",
      generation: 0,
      text: "Hello",
      voice: "am_michael",
    });
  });

  it("fails a hung model preload and terminates the worker", async () => {
    vi.useFakeTimers();
    const worker = createMockWorker();
    const client = createTestClient(() => worker);

    const preload = client.preload();
    const rejection = expect(preload).rejects.toThrow("timed out");

    await vi.advanceTimersByTimeAsync(PRELOAD_TIMEOUT_MS);

    await rejection;
    expect(worker.terminate).toHaveBeenCalledTimes(1);
  });

  it("fails a hung synthesis and terminates the worker", async () => {
    vi.useFakeTimers();
    const worker = createMockWorker();
    const client = createTestClient(() => worker);

    const synth = client.synthesize("Hello");
    const rejection = expect(synth).rejects.toThrow("timed out");

    await vi.advanceTimersByTimeAsync(SYNTH_TIMEOUT_MS);

    await rejection;
    expect(worker.terminate).toHaveBeenCalledTimes(1);
  });

  it("terminates and ignores late results after synthesis timeout", async () => {
    vi.useFakeTimers();
    const worker = createMockWorker();
    const client = createTestClient(() => worker);
    const synth = client.synthesize("Hello");
    const rejection = expect(synth).rejects.toThrow(
      `Browser TTS synthesis timed out after ${SYNTH_TIMEOUT_MS}ms`,
    );

    await vi.advanceTimersByTimeAsync(SYNTH_TIMEOUT_MS);
    await rejection;
    expect(worker.terminate).toHaveBeenCalledOnce();
    worker.emit({
      type: "audio",
      requestId: "synth-1",
      generation: 0,
      pcm: new Float32Array([0.5]).buffer,
      sampleRate: 24_000,
    });
  });

  it("rejects and terminates on a native worker error event", async () => {
    const worker = createMockWorker();
    const client = createTestClient(() => worker);
    const statuses: string[] = [];
    client.subscribe((status) => statuses.push(status));

    const synth = client.synthesize("Hello");
    const rejection = expect(synth).rejects.toThrow("native worker exploded");
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
