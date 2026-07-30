// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { initialSttState, type SttEngine, type SttState } from "@/lib/stt/stt-engine";

const {
  selectSttEngine,
  createWebSpeechEngine,
  createLocalSttEngine,
  createMicRecorder,
  getSharedMoonshineWorkerClient,
} = vi.hoisted(() => ({
  selectSttEngine: vi.fn(),
  createWebSpeechEngine: vi.fn(),
  createLocalSttEngine: vi.fn(),
  createMicRecorder: vi.fn(() => ({})),
  getSharedMoonshineWorkerClient: vi.fn(() => ({})),
}));

vi.mock("@/lib/stt/browser-stt", () => ({ selectSttEngine }));
vi.mock("@/lib/stt/web-speech-engine", () => ({ createWebSpeechEngine }));
vi.mock("@/lib/stt/local-stt-engine", () => ({ createLocalSttEngine }));
vi.mock("@/lib/stt/capture", () => ({ createMicRecorder }));
vi.mock("@/lib/stt/moonshine-worker-client", () => ({ getSharedMoonshineWorkerClient }));

import { useSpeechRecognition } from "./useSpeechRecognition";

type FakeEngine = SttEngine & { emit: (patch: Partial<SttState>) => void };

function makeFakeEngine(): FakeEngine {
  let listener: ((s: SttState) => void) | null = null;
  let state: SttState = { ...initialSttState };
  return {
    hasSupport: true,
    start: vi.fn(),
    stop: vi.fn(),
    dispose: vi.fn(),
    subscribe(l) {
      listener = l;
      l(state);
      return () => {
        listener = null;
      };
    },
    emit(patch) {
      state = { ...state, ...patch };
      listener?.(state);
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
});

describe("useSpeechRecognition dispatcher", () => {
  it("uses the Web Speech engine when selected and mirrors its state", () => {
    const engine = makeFakeEngine();
    selectSttEngine.mockReturnValue("web-speech");
    createWebSpeechEngine.mockReturnValue(engine);

    const { result } = renderHook(() => useSpeechRecognition());

    expect(createWebSpeechEngine).toHaveBeenCalledTimes(1);
    expect(createLocalSttEngine).not.toHaveBeenCalled();

    act(() => result.current.startRecording());
    expect(engine.start).toHaveBeenCalledTimes(1);

    act(() => engine.emit({ isRecording: true, interimTranscript: "hi", volatileTranscript: "there" }));
    expect(result.current.isRecording).toBe(true);
    expect(result.current.interimTranscript).toBe("hi");
    expect(result.current.volatileTranscript).toBe("there");

    act(() => engine.emit({ finalTranscriptBlock: "done", isRecording: false }));
    expect(result.current.finalTranscriptBlock).toBe("done");

    act(() => result.current.stopRecording());
    expect(engine.stop).toHaveBeenCalledTimes(1);
  });

  it("builds the local engine with a mic recorder and shared worker client", () => {
    const engine = makeFakeEngine();
    selectSttEngine.mockReturnValue("local");
    createLocalSttEngine.mockReturnValue(engine);

    renderHook(() => useSpeechRecognition());

    expect(createLocalSttEngine).toHaveBeenCalledTimes(1);
    expect(createWebSpeechEngine).not.toHaveBeenCalled();
    const arg = createLocalSttEngine.mock.calls[0][0];
    expect(typeof arg.createRecorder).toBe("function");
    expect(arg.client).toBeDefined();
  });

  it("toggleRecording starts when idle and stops when recording", () => {
    const engine = makeFakeEngine();
    selectSttEngine.mockReturnValue("web-speech");
    createWebSpeechEngine.mockReturnValue(engine);

    const { result } = renderHook(() => useSpeechRecognition());

    act(() => result.current.toggleRecording());
    expect(engine.start).toHaveBeenCalledTimes(1);

    act(() => engine.emit({ isRecording: true }));
    act(() => result.current.toggleRecording());
    expect(engine.stop).toHaveBeenCalledTimes(1);
  });

  it("reports no support and an error when no engine is available", () => {
    selectSttEngine.mockReturnValue("none");

    const { result } = renderHook(() => useSpeechRecognition());

    expect(result.current.hasSupport).toBe(false);
    expect(result.current.speechError).toBeTruthy();
  });

  it("disposes the engine on unmount", () => {
    const engine = makeFakeEngine();
    selectSttEngine.mockReturnValue("web-speech");
    createWebSpeechEngine.mockReturnValue(engine);

    const { unmount } = renderHook(() => useSpeechRecognition());
    unmount();
    expect(engine.dispose).toHaveBeenCalledTimes(1);
  });
});
