// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useStreamingTTS } from "./useStreamingTTS";

// ─── Speech Synthesis mock ────────────────────────────────────────────────────

const mockSpeak = vi.fn();
const mockCancel = vi.fn();

let speechSynthesisMock: {
  speak: ReturnType<typeof vi.fn>;
  cancel: ReturnType<typeof vi.fn>;
  getVoices: ReturnType<typeof vi.fn>;
  addEventListener: ReturnType<typeof vi.fn>;
  removeEventListener: ReturnType<typeof vi.fn>;
};

// ─── SpeechSynthesisUtterance mock ───────────────────────────────────────────

class MockSpeechSynthesisUtterance {
  text: string;
  rate = 1;
  onend: (() => void) | null = null;
  onerror: (() => void) | null = null;
  constructor(text: string) {
    this.text = text;
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function renderTTS(initialCompleted = "", initialStreaming = "") {
  return renderHook(
    ({ completedText, streamingText }: { completedText: string; streamingText: string }) =>
      useStreamingTTS({ completedText, streamingText }),
    { initialProps: { completedText: initialCompleted, streamingText: initialStreaming } }
  );
}

// ─── Setup / teardown ────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  speechSynthesisMock = {
    speak: mockSpeak,
    cancel: mockCancel,
    getVoices: vi.fn().mockReturnValue([]),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  };
  vi.stubGlobal("speechSynthesis", speechSynthesisMock);
  vi.stubGlobal("SpeechSynthesisUtterance", MockSpeechSynthesisUtterance);
  localStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("useStreamingTTS", () => {
  describe("speaking completed text", () => {
    it("speaks the full text when completedText is provided", () => {
      const { rerender } = renderTTS("");

      act(() => {
        rerender({ completedText: "Hello world. This is a test", streamingText: "" });
      });

      expect(mockSpeak).toHaveBeenCalledTimes(1);
      const utterance = mockSpeak.mock.calls[0][0] as MockSpeechSynthesisUtterance;
      expect(utterance.text).toBe("Hello world. This is a test");
    });

    it("does not speak on initial empty string", () => {
      renderTTS("");
      expect(mockSpeak).not.toHaveBeenCalled();
    });

    it("queues the new text when completedText changes during active playback", () => {
      const { rerender } = renderTTS("First response.");
      const firstUtterance = mockSpeak.mock.calls[0][0] as MockSpeechSynthesisUtterance;

      mockSpeak.mockClear();

      act(() => {
        rerender({ completedText: "Second response.", streamingText: "" });
      });

      expect(mockSpeak).not.toHaveBeenCalled();

      act(() => {
        firstUtterance.onend?.();
      });

      expect(mockSpeak).toHaveBeenCalledTimes(1);
      const utterance = mockSpeak.mock.calls[0][0] as MockSpeechSynthesisUtterance;
      expect(utterance.text).toBe("Second response.");
    });

    it("does not speak when completedText resets to empty", () => {
      const { rerender } = renderTTS("Some text.");

      mockSpeak.mockClear();

      act(() => {
        rerender({ completedText: "", streamingText: "" });
      });

      expect(mockSpeak).not.toHaveBeenCalled();
    });

    it("speaks completed sentences while text is still streaming", () => {
      const { rerender } = renderTTS("", "");

      act(() => {
        rerender({ completedText: "", streamingText: "First sentence. Second" });
      });

      expect(mockSpeak).toHaveBeenCalledTimes(1);
      const utterance = mockSpeak.mock.calls[0][0] as MockSpeechSynthesisUtterance;
      expect(utterance.text).toBe("First sentence.");
    });

    it("flushes the remaining partial sentence when the stream completes", () => {
      const { rerender } = renderTTS("", "");

      act(() => {
        rerender({ completedText: "", streamingText: "First sentence. Second" });
      });

      const firstUtterance = mockSpeak.mock.calls[0][0] as MockSpeechSynthesisUtterance;
      act(() => {
        firstUtterance.onend?.();
      });

      mockSpeak.mockClear();

      act(() => {
        rerender({ completedText: "First sentence. Second", streamingText: "" });
      });

      expect(mockSpeak).toHaveBeenCalledTimes(1);
      const remainderUtterance = mockSpeak.mock.calls[0][0] as MockSpeechSynthesisUtterance;
      expect(remainderUtterance.text).toBe("Second");
    });
  });

  describe("markdown stripping", () => {
    it("strips bold markdown before speaking", () => {
      const { rerender } = renderTTS("");

      act(() => {
        rerender({ completedText: "**Important point.**", streamingText: "" });
      });

      expect(mockSpeak).toHaveBeenCalledTimes(1);
      const utterance = mockSpeak.mock.calls[0][0] as MockSpeechSynthesisUtterance;
      expect(utterance.text).not.toContain("**");
      expect(utterance.text).toContain("Important point.");
    });

    it("strips inline code before speaking", () => {
      const { rerender } = renderTTS("");

      act(() => {
        rerender({ completedText: "Use `Array.prototype.map` to iterate.", streamingText: "" });
      });

      expect(mockSpeak).toHaveBeenCalledTimes(1);
      const utterance = mockSpeak.mock.calls[0][0] as MockSpeechSynthesisUtterance;
      expect(utterance.text).not.toContain("`");
      expect(utterance.text).toContain("Array.prototype.map");
    });

    it("does not speak a segment that is empty after stripping markdown", () => {
      const { rerender } = renderTTS("");

      act(() => {
        rerender({ completedText: "**   **", streamingText: "" });
      });

      expect(mockSpeak).not.toHaveBeenCalled();
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

    it("cancels speech synthesis when muted", () => {
      const { result } = renderTTS("");

      act(() => {
        result.current.setMuted(true);
      });

      expect(mockCancel).toHaveBeenCalled();
    });

    it("does not speak when muted, even with completed text", () => {
      localStorage.setItem("tts_muted", "1");
      const { rerender } = renderTTS("");

      act(() => {
        rerender({ completedText: "A complete sentence.", streamingText: "" });
      });

      expect(mockSpeak).not.toHaveBeenCalled();
    });
  });

  describe("cancel()", () => {
    it("calls speechSynthesis.cancel", () => {
      const { result } = renderTTS("First response.");

      mockCancel.mockClear();

      act(() => {
        result.current.cancel();
      });

      expect(mockCancel).toHaveBeenCalled();
    });
  });

  describe("unmount cleanup", () => {
    it("cancels speech synthesis when the component unmounts", () => {
      const { unmount } = renderTTS("Ongoing response");

      mockCancel.mockClear();
      unmount();

      expect(mockCancel).toHaveBeenCalled();
    });
  });

  describe("speak() error resilience", () => {
    it("does not throw when speak() throws", () => {
      mockSpeak.mockImplementationOnce(() => { throw new Error("NotAllowedError"); });

      const { rerender } = renderTTS("");

      expect(() => {
        act(() => {
          rerender({ completedText: "A response that causes speak to throw.", streamingText: "" });
        });
      }).not.toThrow();
    });
  });

  describe("enabled guard", () => {
    it("does not speak when enabled is false, even with completed text", () => {
      renderHook(() =>
        useStreamingTTS({ completedText: "A complete sentence.", enabled: false })
      );

      expect(mockSpeak).not.toHaveBeenCalled();
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

      expect(mockSpeak).not.toHaveBeenCalled();
    });
  });
});
