// @vitest-environment jsdom

import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useStreamingTTS } from "./useStreamingTTS";
import type { BrowserTtsEngine } from "@/lib/tts/browser-tts";

const mockFetch = vi.fn();
const mockSourceStart = vi.fn();
const mockSourceStop = vi.fn();

class MockAudioContext {
  state: "running" | "suspended" = "running";
  destination = {};
  resume = vi.fn().mockResolvedValue(undefined);
  close = vi.fn().mockResolvedValue(undefined);
  createBuffer = vi.fn(() => ({ copyToChannel: vi.fn() }));
  createBufferSource = vi.fn(() => ({
    buffer: null,
    playbackRate: { value: 1 },
    connect: vi.fn(),
    start: mockSourceStart,
    stop: mockSourceStop,
    onended: null,
  }));
}

function createEngine(overrides: Partial<BrowserTtsEngine> = {}): BrowserTtsEngine {
  return {
    preload: vi.fn().mockResolvedValue(undefined),
    synthesize: vi.fn().mockResolvedValue({
      pcm: new Float32Array([0.1, -0.1]),
      sampleRate: 24_000,
    }),
    cancel: vi.fn(),
    dispose: vi.fn(),
    subscribe: vi.fn((listener) => {
      listener("ready");
      return () => {};
    }),
    ...overrides,
  };
}

function renderTTS(engine: BrowserTtsEngine) {
  return renderHook(
    ({ completedText, streamingText }: { completedText: string; streamingText: string }) =>
      useStreamingTTS({ completedText, streamingText, localTtsEnabled: true, ttsEngine: engine }),
    { initialProps: { completedText: "", streamingText: "" } },
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("fetch", mockFetch);
  vi.stubGlobal("AudioContext", MockAudioContext as unknown as typeof AudioContext);
  localStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useStreamingTTS", () => {
  it("preloads Kokoro before there is any interview speech", async () => {
    const engine = createEngine();
    const { result } = renderTTS(engine);

    await waitFor(() => {
      expect(engine.preload).toHaveBeenCalled();
      expect(result.current.status).toBe("ready");
    });
  });

  it("waits for Kokoro instead of sending the first response to a remote TTS provider", async () => {
    let resolvePreload: (() => void) | undefined;
    const engine = createEngine({
      preload: vi.fn(() => new Promise<void>((resolve) => { resolvePreload = resolve; })),
    });
    const { rerender } = renderTTS(engine);

    act(() => {
      rerender({ completedText: "What trade-offs did you make?", streamingText: "" });
    });
    expect(engine.synthesize).not.toHaveBeenCalled();
    expect(mockFetch).not.toHaveBeenCalled();

    resolvePreload?.();
    await waitFor(() => {
      expect(engine.synthesize).toHaveBeenCalledWith("What trade-offs did you make?", { persona: undefined });
    });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("speaks completed streamed sentences with Kokoro only", async () => {
    const engine = createEngine();
    const { rerender } = renderTTS(engine);

    await waitFor(() => expect(engine.preload).toHaveBeenCalled());
    act(() => {
      rerender({ completedText: "", streamingText: "How would you scale this service?" });
    });
    act(() => {
      rerender({ completedText: "How would you scale this service?", streamingText: "" });
    });

    await waitFor(() => expect(engine.synthesize).toHaveBeenCalledTimes(1));
    expect(engine.synthesize).toHaveBeenCalledWith("How would you scale this service?", { persona: undefined });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("surfaces a Kokoro error without falling back to ElevenLabs", async () => {
    const engine = createEngine({
      synthesize: vi.fn().mockRejectedValue(new Error("Kokoro unavailable")),
    });
    const { rerender, result } = renderTTS(engine);

    await waitFor(() => expect(result.current.status).toBe("ready"));
    act(() => {
      rerender({ completedText: "Tell me about a difficult project.", streamingText: "" });
    });

    await waitFor(() => expect(result.current.status).toBe("error"));
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("cancels local playback when muted", async () => {
    const engine = createEngine();
    const { rerender, result } = renderTTS(engine);

    await waitFor(() => expect(result.current.status).toBe("ready"));
    act(() => {
      rerender({ completedText: "Describe a system you built.", streamingText: "" });
    });
    await waitFor(() => expect(mockSourceStart).toHaveBeenCalled());

    act(() => result.current.setMuted(true));
    expect(engine.cancel).toHaveBeenCalled();
    expect(mockSourceStop).toHaveBeenCalled();
  });
});
