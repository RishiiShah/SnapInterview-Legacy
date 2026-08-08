import { describe, expect, it } from "vitest";
import { createWebSpeechEngine, type RecognitionLike } from "./web-speech-engine";
import type { SttState } from "./stt-engine";

function makeFakeRecognition() {
  const rec: RecognitionLike & { _started: number; _stopped: number } = {
    continuous: false,
    interimResults: false,
    lang: "",
    onresult: null,
    onerror: null,
    onend: null,
    _started: 0,
    _stopped: 0,
    start() {
      this._started += 1;
    },
    stop() {
      this._stopped += 1;
    },
  };
  return rec;
}

function resultEvent(entries: Array<{ transcript: string; isFinal: boolean }>) {
  return {
    resultIndex: 0,
    results: {
      length: entries.length,
      ...Object.fromEntries(
        entries.map((e, i) => [i, { isFinal: e.isFinal, 0: { transcript: e.transcript } }]),
      ),
    },
  };
}

function track(engine: ReturnType<typeof createWebSpeechEngine>) {
  const states: SttState[] = [];
  engine.subscribe((s) => states.push({ ...s }));
  return () => states[states.length - 1];
}

describe("createWebSpeechEngine", () => {
  it("reports no support when the factory returns null", () => {
    const engine = createWebSpeechEngine(() => null);
    expect(engine.hasSupport).toBe(false);
  });

  it("marks recording and starts recognition on start()", () => {
    const rec = makeFakeRecognition();
    const engine = createWebSpeechEngine(() => rec);
    const latest = track(engine);
    engine.start();
    expect(rec._started).toBe(1);
    expect(latest().isRecording).toBe(true);
  });

  it("accumulates final results into interimTranscript and exposes interim as volatile", () => {
    const rec = makeFakeRecognition();
    const engine = createWebSpeechEngine(() => rec);
    const latest = track(engine);
    engine.start();

    rec.onresult?.(resultEvent([{ transcript: "hello world", isFinal: true }]));
    expect(latest().interimTranscript).toBe("hello world");

    rec.onresult?.(resultEvent([{ transcript: "how are", isFinal: false }]));
    expect(latest().volatileTranscript).toBe("how are");
    expect(latest().interimTranscript).toBe("hello world");
  });

  it("publishes finalTranscriptBlock when the user stops", () => {
    const rec = makeFakeRecognition();
    const engine = createWebSpeechEngine(() => rec);
    const latest = track(engine);
    engine.start();
    rec.onresult?.(resultEvent([{ transcript: "final answer", isFinal: true }]));
    engine.stop();
    rec.onend?.();
    expect(latest().finalTranscriptBlock).toBe("final answer");
    expect(latest().isRecording).toBe(false);
  });

  it("auto-restarts on unexpected onend while recording (e.g. no-speech dip)", () => {
    const rec = makeFakeRecognition();
    const engine = createWebSpeechEngine(() => rec);
    engine.start();
    expect(rec._started).toBe(1);
    rec.onend?.(); // ended without a user stop
    expect(rec._started).toBe(2);
  });

  it("ignores no-speech errors without dropping recording state", () => {
    const rec = makeFakeRecognition();
    const engine = createWebSpeechEngine(() => rec);
    const latest = track(engine);
    engine.start();
    rec.onerror?.({ error: "no-speech" });
    expect(latest().isRecording).toBe(true);
    expect(latest().error).toBeNull();
  });

  it("surfaces real errors and stops recording", () => {
    const rec = makeFakeRecognition();
    const engine = createWebSpeechEngine(() => rec);
    const latest = track(engine);
    engine.start();
    rec.onerror?.({ error: "not-allowed" });
    expect(latest().isRecording).toBe(false);
    expect(latest().error).toBeTruthy();
  });
});
