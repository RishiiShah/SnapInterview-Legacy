import { afterEach, describe, expect, it, vi } from "vitest";
import { createLocalSttEngine } from "./local-stt-engine";
import type { AudioRecorder, SttState } from "./stt-engine";
import type { MoonshineClient } from "./moonshine-worker-client";

afterEach(() => {
  vi.useRealTimers();
});

function fakeRecorder(pcm = new Float32Array([0.1, 0.2]), sampleRate = 16_000): AudioRecorder {
  return {
    start: vi.fn(() => Promise.resolve()),
    stop: vi.fn(),
    read: vi.fn(() => ({ pcm, sampleRate })),
    dispose: vi.fn(),
  };
}

function fakeClient() {
  const deferreds: Array<{ resolve: (t: string) => void; reject: (e: Error) => void }> = [];
  const client = {
    preload: vi.fn(() => Promise.resolve()),
    transcribe: vi.fn(
      () => new Promise<string>((resolve, reject) => deferreds.push({ resolve, reject })),
    ),
    cancel: vi.fn(),
    dispose: vi.fn(),
    subscribe: vi.fn(() => () => {}),
  } as unknown as MoonshineClient & { transcribe: ReturnType<typeof vi.fn> };
  return { client, resolveCall: (i: number, text: string) => deferreds[i].resolve(text) };
}

function track(engine: ReturnType<typeof createLocalSttEngine>) {
  const states: SttState[] = [];
  engine.subscribe((s) => states.push({ ...s }));
  return () => states[states.length - 1];
}

describe("createLocalSttEngine", () => {
  it("always reports support", () => {
    const engine = createLocalSttEngine({ createRecorder: () => fakeRecorder(), client: fakeClient().client });
    expect(engine.hasSupport).toBe(true);
  });

  it("preloads the model and starts the recorder on start()", async () => {
    vi.useFakeTimers();
    const rec = fakeRecorder();
    const { client } = fakeClient();
    const engine = createLocalSttEngine({ createRecorder: () => rec, client, intervalMs: 1_500 });
    const latest = track(engine);

    engine.start();
    await vi.advanceTimersByTimeAsync(0);

    expect(client.preload).toHaveBeenCalledTimes(1);
    expect(rec.start).toHaveBeenCalledTimes(1);
    expect(latest().isRecording).toBe(true);
  });

  it("transcribes the rolling buffer on each tick and updates interimTranscript", async () => {
    vi.useFakeTimers();
    const rec = fakeRecorder();
    const { client, resolveCall } = fakeClient();
    const engine = createLocalSttEngine({ createRecorder: () => rec, client, intervalMs: 1_500 });
    const latest = track(engine);

    engine.start();
    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(1_500);

    expect(client.transcribe).toHaveBeenCalledTimes(1);
    resolveCall(0, "hello world");
    await vi.advanceTimersByTimeAsync(0);
    expect(latest().interimTranscript).toBe("hello world");
  });

  it("skips overlapping ticks while a transcribe is still in flight", async () => {
    vi.useFakeTimers();
    const rec = fakeRecorder();
    const { client, resolveCall } = fakeClient();
    const engine = createLocalSttEngine({ createRecorder: () => rec, client, intervalMs: 1_500 });
    track(engine);

    engine.start();
    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(1_500); // tick 1 → transcribe (unresolved)
    await vi.advanceTimersByTimeAsync(1_500); // tick 2 → skipped, still busy
    expect(client.transcribe).toHaveBeenCalledTimes(1);

    resolveCall(0, "partial");
    await vi.advanceTimersByTimeAsync(1_500); // tick 3 → free again
    expect(client.transcribe).toHaveBeenCalledTimes(2);
  });

  it("stops recording and publishes the final transcript on stop()", async () => {
    vi.useFakeTimers();
    const rec = fakeRecorder();
    const { client, resolveCall } = fakeClient();
    const engine = createLocalSttEngine({ createRecorder: () => rec, client, intervalMs: 1_500 });
    const latest = track(engine);

    engine.start();
    await vi.advanceTimersByTimeAsync(0);
    engine.stop();
    await vi.advanceTimersByTimeAsync(0);

    expect(rec.stop).toHaveBeenCalledTimes(1);
    expect(latest().isRecording).toBe(false);

    const finalCall = client.transcribe.mock.calls.length - 1;
    resolveCall(finalCall, "final answer");
    await vi.advanceTimersByTimeAsync(0);
    expect(latest().finalTranscriptBlock).toBe("final answer");
  });

  it("surfaces an error and stops recording when preload fails", async () => {
    vi.useFakeTimers();
    const rec = fakeRecorder();
    const { client } = fakeClient();
    (client.preload as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("load fail"));
    const engine = createLocalSttEngine({ createRecorder: () => rec, client, intervalMs: 1_500 });
    const latest = track(engine);

    engine.start();
    await vi.advanceTimersByTimeAsync(0);

    expect(latest().isRecording).toBe(false);
    expect(latest().error).toBeTruthy();
    expect(rec.start).not.toHaveBeenCalled();
  });
});
