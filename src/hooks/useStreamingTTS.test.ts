// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useStreamingTTS } from "./useStreamingTTS";
import type { BrowserTtsAudio, BrowserTtsEngine } from "@/lib/tts/browser-tts";

type TTSRequestPayload = {
  text: string;
  persona?: string | null;
};

type MockAudioSource = {
  buffer: unknown;
  playbackRate: { value: number };
  onended: (() => void) | null;
  connect: ReturnType<typeof vi.fn>;
  start: ReturnType<typeof vi.fn>;
  stop: ReturnType<typeof vi.fn>;
};

const mockFetch = vi.fn();
const mockAudioContextResume = vi.fn();
const mockAudioContextClose = vi.fn();
const mockDecodeAudioData = vi.fn();
const mockCreateBufferSource = vi.fn();
const mockSourceConnect = vi.fn();
const mockSourceStart = vi.fn();
const mockSourceStop = vi.fn();

let latestSource: MockAudioSource | null = null;

class MockAudioContext {
  state: "running" | "suspended" = "running";
  destination = {};
  resume = mockAudioContextResume.mockResolvedValue(undefined);
  close = mockAudioContextClose.mockResolvedValue(undefined);
  decodeAudioData = mockDecodeAudioData.mockResolvedValue({});
  createBuffer = vi.fn(() => ({ copyToChannel: vi.fn() }));
  createBufferSource = mockCreateBufferSource.mockImplementation(() => {
    const source: MockAudioSource = {
      buffer: null,
      playbackRate: { value: 1 },
      onended: null,
      connect: mockSourceConnect,
      start: mockSourceStart,
      stop: mockSourceStop,
    };
    latestSource = source;
    return source;
  });

  constructor() {}
}

function createSuccessfulTtsResponse() {
  return {
    ok: true,
    status: 200,
    arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8)),
    text: vi.fn().mockResolvedValue(""),
  };
}

function getFetchPayload(index = 0): TTSRequestPayload {
  const init = mockFetch.mock.calls[index]?.[1] as RequestInit | undefined;
  const body = init?.body;
  return JSON.parse(typeof body === "string" ? body : "{}");
}

async function expectFetchText(text: string, index = 0) {
  await waitFor(() => {
    expect(mockFetch).toHaveBeenCalledTimes(index + 1);
  });
  expect(getFetchPayload(index).text).toBe(text);
}

async function waitForSourceReady() {
  await waitFor(() => {
    expect(latestSource).not.toBeNull();
    expect(mockSourceStart).toHaveBeenCalled();
  });
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function createLocalTtsEngine(overrides: Partial<BrowserTtsEngine> = {}): BrowserTtsEngine {
  return {
    preload: vi.fn().mockResolvedValue(undefined),
    synthesize: vi.fn().mockResolvedValue({
      pcm: new Float32Array([0.1, -0.1]),
      sampleRate: 24_000,
    }),
    cancel: vi.fn(),
    dispose: vi.fn(),
    subscribe: vi.fn((listener: (status: "idle" | "loading" | "ready" | "fallback" | "error") => void) => {
      listener("ready");
      return () => {};
    }),
    ...overrides,
  };
}

function renderTTS(
  initialCompleted = "",
  initialStreaming = "",
  options: { localTtsEnabled?: boolean; ttsEngine?: BrowserTtsEngine } = {},
) {
  return renderHook(
    ({ completedText, streamingText }: { completedText: string; streamingText: string }) =>
      useStreamingTTS({
        completedText,
        streamingText,
        localTtsEnabled: options.localTtsEnabled ?? false,
        ttsEngine: options.ttsEngine,
      }),
    { initialProps: { completedText: initialCompleted, streamingText: initialStreaming } }
  );
}

// ─── Setup / teardown ────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  latestSource = null;
  mockFetch.mockResolvedValue(createSuccessfulTtsResponse());
  vi.stubGlobal("fetch", mockFetch);
  vi.stubGlobal("AudioContext", MockAudioContext as unknown as typeof AudioContext);
  localStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("useStreamingTTS", () => {
  describe("browser-local provider", () => {
    it("preloads the local engine and reports ready without waiting for playback", async () => {
      const engine = createLocalTtsEngine();
      const { result } = renderTTS("", "", { localTtsEnabled: true, ttsEngine: engine });

      await waitFor(() => {
        expect(engine.preload).toHaveBeenCalledTimes(1);
        expect(result.current.status).toBe("ready");
      });
    });

    it("uses local synthesis without calling the server TTS route", async () => {
      const engine = createLocalTtsEngine();
      const { rerender } = renderTTS("", "", { localTtsEnabled: true, ttsEngine: engine });

      act(() => {
        rerender({ completedText: "Local interviewer voice.", streamingText: "" });
      });

      await waitFor(() => {
        expect(engine.synthesize).toHaveBeenCalledWith("Local interviewer voice.", { persona: undefined });
      });
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("switches to server fallback once after local synthesis fails", async () => {
      const engine = createLocalTtsEngine({
        synthesize: vi.fn().mockRejectedValue(new Error("local engine unavailable")),
      });
      const { rerender, result } = renderTTS("", "", { localTtsEnabled: true, ttsEngine: engine });

      act(() => {
        rerender({ completedText: "First local attempt.", streamingText: "" });
      });

      await expectFetchText("First local attempt.");
      expect(result.current.status).toBe("fallback");

      expect(engine.synthesize).toHaveBeenCalledTimes(1);
    });

    it("does not call server fallback when local synthesis is cancelled by unmount", async () => {
      let rejectSynthesis: ((error: Error) => void) | undefined;
      const engine = createLocalTtsEngine({
        synthesize: vi.fn(
          () =>
            new Promise<BrowserTtsAudio>((_, reject) => {
              rejectSynthesis = reject;
            }),
        ),
        cancel: vi.fn(() => rejectSynthesis?.(new Error("cancelled"))),
        dispose: vi.fn(() => rejectSynthesis?.(new Error("disposed"))),
      });
      const { rerender, unmount } = renderTTS("", "", { localTtsEnabled: true, ttsEngine: engine });

      act(() => {
        rerender({ completedText: "Pending local speech.", streamingText: "" });
      });
      await waitFor(() => expect(engine.synthesize).toHaveBeenCalledTimes(1));

      unmount();
      await act(async () => {
        await Promise.resolve();
      });

      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe("speaking completed text", () => {
    it("speaks the full text when completedText is provided", async () => {
      const { rerender } = renderTTS("");

      act(() => {
        rerender({ completedText: "Hello world. This is a test", streamingText: "" });
      });

      await expectFetchText("Hello world. This is a test");
    });

    it("does not speak on initial empty string", () => {
      renderTTS("");
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("queues the new text when completedText changes during active playback", async () => {
      const { rerender } = renderTTS("First response.");

      await expectFetchText("First response.");
      await waitForSourceReady();

      mockFetch.mockClear();

      act(() => {
        rerender({ completedText: "Second response.", streamingText: "" });
      });

      expect(mockFetch).not.toHaveBeenCalled();

      act(() => {
        latestSource?.onended?.();
      });

      await expectFetchText("Second response.");
    });

    it("does not speak when completedText resets to empty", async () => {
      const { rerender } = renderTTS("Some text.");

      await expectFetchText("Some text.");

      mockFetch.mockClear();

      act(() => {
        rerender({ completedText: "", streamingText: "" });
      });

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("speaks completed sentences while text is still streaming", async () => {
      const { rerender } = renderTTS("", "");

      act(() => {
        rerender({ completedText: "", streamingText: "First sentence. Second" });
      });

      await expectFetchText("First sentence.");
    });

    it("flushes the remaining partial sentence when the stream completes", async () => {
      const { rerender } = renderTTS("", "");

      act(() => {
        rerender({ completedText: "", streamingText: "First sentence. Second" });
      });

      await expectFetchText("First sentence.");
      await waitForSourceReady();

      act(() => {
        latestSource?.onended?.();
      });

      mockFetch.mockClear();

      act(() => {
        rerender({ completedText: "First sentence. Second", streamingText: "" });
      });

      await expectFetchText("Second");
    });
  });

  describe("markdown stripping", () => {
    it("strips bold markdown before speaking", async () => {
      const { rerender } = renderTTS("");

      act(() => {
        rerender({ completedText: "**Important point.**", streamingText: "" });
      });

      await expectFetchText("Important point.");
    });

    it("strips inline code before speaking", async () => {
      const { rerender } = renderTTS("");

      act(() => {
        rerender({ completedText: "Use `Array.prototype.map` to iterate.", streamingText: "" });
      });

      await expectFetchText("Use Array.prototype.map to iterate.");
    });

    it("does not speak a segment that is empty after stripping markdown", () => {
      const { rerender } = renderTTS("");

      act(() => {
        rerender({ completedText: "**   **", streamingText: "" });
      });

      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe("mute / unmute", () => {
    it("starts unmuted by default", () => {
      const { result } = renderTTS("");
      expect(result.current.muted).toBe(false);
    });

    it("reads initial muted state from localStorage", () => {
      localStorage.setItem("tts_muted", "1");
      const { result } = renderTTS("");
      expect(result.current.muted).toBe(true);
    });

    it("persists muted state to localStorage when setMuted is called", () => {
      const { result } = renderTTS("");

      act(() => {
        result.current.setMuted(true);
      });

      expect(localStorage.getItem("tts_muted")).toBe("1");
    });

    it("persists unmuted state to localStorage when setMuted(false) is called", () => {
      localStorage.setItem("tts_muted", "1");
      const { result } = renderTTS("");

      act(() => {
        result.current.setMuted(false);
      });

      expect(localStorage.getItem("tts_muted")).toBe("0");
      expect(result.current.muted).toBe(false);
    });

    it("stops active audio when muted", async () => {
      const { result, rerender } = renderTTS("");

      act(() => {
        rerender({ completedText: "Playing right now.", streamingText: "" });
      });

      await expectFetchText("Playing right now.");
      await waitForSourceReady();

      act(() => {
        result.current.setMuted(true);
      });

      expect(mockSourceStop).toHaveBeenCalled();
    });

    it("does not speak when muted, even with completed text", () => {
      localStorage.setItem("tts_muted", "1");
      const { rerender } = renderTTS("");

      act(() => {
        rerender({ completedText: "A complete sentence.", streamingText: "" });
      });

      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe("cancel()", () => {
    it("stops active audio", async () => {
      const { result } = renderTTS("First response.");

      await expectFetchText("First response.");
      await waitForSourceReady();

      mockSourceStop.mockClear();

      act(() => {
        result.current.cancel();
      });

      expect(mockSourceStop).toHaveBeenCalled();
    });
  });

  describe("unmount cleanup", () => {
    it("cleans up active audio context on unmount", async () => {
      const { unmount } = renderTTS("Ongoing response");

      await expectFetchText("Ongoing response");
      await waitForSourceReady();

      mockSourceStop.mockClear();
      mockAudioContextClose.mockClear();
      unmount();

      expect(mockSourceStop).toHaveBeenCalled();
      expect(mockAudioContextClose).toHaveBeenCalled();
    });
  });

  describe("speak() error resilience", () => {
    it("does not throw when /api/tts request fails", async () => {
      mockFetch.mockRejectedValueOnce(new Error("NetworkError"));

      const { rerender } = renderTTS("", "");

      expect(() => {
        act(() => {
          rerender({ completedText: "", streamingText: "First sentence. Second sentence." });
        });
      }).not.toThrow();

      act(() => {
        rerender({ completedText: "First sentence. Second sentence.", streamingText: "" });
      });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(2);
      });

      expect(getFetchPayload(0).text).toBe("First sentence.");
      expect(getFetchPayload(1).text).toBe("Second sentence.");
    });
  });

  describe("enabled guard", () => {
    it("does not speak when enabled is false, even with completed text", () => {
      renderHook(() =>
        useStreamingTTS({ completedText: "A complete sentence.", enabled: false })
      );

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("does not speak when enabled toggles to false", () => {
      const { rerender } = renderHook(
        ({ text, enabled }: { text: string; enabled: boolean }) =>
          useStreamingTTS({ completedText: text, enabled }),
        { initialProps: { text: "", enabled: true } }
      );

      act(() => {
        rerender({ text: "Some response.", enabled: false });
      });

      expect(mockFetch).not.toHaveBeenCalled();
    });
  });
});
