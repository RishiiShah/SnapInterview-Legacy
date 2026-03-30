// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useStreamingTTS } from "./useStreamingTTS";

// ─── Speech Synthesis mock ────────────────────────────────────────────────────

// Defined at module level so tests can assert call counts on them.
const mockSpeak = vi.fn();
const mockCancel = vi.fn();

// Rebuilt inside beforeEach so restoreMocks:true doesn't wipe the implementations.
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
  constructor(text: string) {
    this.text = text;
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function renderTTS(initial = "") {
  return renderHook(
    ({ text }: { text: string }) =>
      useStreamingTTS({ currentStreamedText: text }),
    { initialProps: { text: initial } }
  );
}

// ─── Setup / teardown ────────────────────────────────────────────────────────

beforeEach(() => {
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
  describe("sentence boundary detection", () => {
    it("speaks a sentence when a full stop is received mid-stream", () => {
      const { rerender } = renderTTS("");

      act(() => {
        rerender({ text: "Hello world. This is a test" });
      });

      expect(mockSpeak).toHaveBeenCalledTimes(1);
      const utterance = mockSpeak.mock.calls[0][0] as MockSpeechSynthesisUtterance;
      expect(utterance.text).toBe("Hello world.");
    });

    it("speaks each sentence in a multi-sentence chunk", () => {
      const { rerender } = renderTTS("");

      act(() => {
        rerender({ text: "First sentence. Second sentence! Third?" });
      });

      expect(mockSpeak).toHaveBeenCalledTimes(3);
    });

    it("does not speak incomplete trailing text without punctuation", () => {
      const { rerender } = renderTTS("");

      act(() => {
        rerender({ text: "No sentence boundary here" });
      });

      expect(mockSpeak).not.toHaveBeenCalled();
    });

    it("flushes trailing text without punctuation when stream ends (text resets to empty)", () => {
      const { rerender } = renderTTS("");

      act(() => {
        rerender({ text: "No punctuation at end" });
      });

      expect(mockSpeak).not.toHaveBeenCalled();

      act(() => {
        rerender({ text: "" });
      });

      expect(mockSpeak).toHaveBeenCalledTimes(1);
      const utterance = mockSpeak.mock.calls[0][0] as MockSpeechSynthesisUtterance;
      expect(utterance.text).toBe("No punctuation at end");
    });

    it("does not re-speak already spoken segments when stream grows", () => {
      const { rerender } = renderTTS("");

      act(() => {
        rerender({ text: "First sentence." });
      });

      expect(mockSpeak).toHaveBeenCalledTimes(1);
      mockSpeak.mockClear();

      act(() => {
        rerender({ text: "First sentence. Second sentence." });
      });

      expect(mockSpeak).toHaveBeenCalledTimes(1);
      const utterance = mockSpeak.mock.calls[0][0] as MockSpeechSynthesisUtterance;
      // stripMarkdown().trim() strips the leading space, so we get "Second sentence."
      expect(utterance.text).toBe("Second sentence.");
    });

    it("resets tracking refs after stream ends so next stream starts fresh", () => {
      const { rerender } = renderTTS("");

      act(() => {
        rerender({ text: "Stream one." });
      });

      act(() => {
        rerender({ text: "" });
      });

      mockSpeak.mockClear();

      act(() => {
        rerender({ text: "Stream two." });
      });

      expect(mockSpeak).toHaveBeenCalledTimes(1);
      const utterance = mockSpeak.mock.calls[0][0] as MockSpeechSynthesisUtterance;
      expect(utterance.text).toBe("Stream two.");
    });
  });

  describe("markdown stripping", () => {
    it("strips bold markdown before speaking", () => {
      const { rerender } = renderTTS("");

      act(() => {
        rerender({ text: "**Important point.**" });
      });

      // Flush tail on reset
      act(() => {
        rerender({ text: "" });
      });

      const calls = mockSpeak.mock.calls.map(
        (c) => (c[0] as MockSpeechSynthesisUtterance).text
      );
      expect(calls.some((t) => t.includes("**"))).toBe(false);
      expect(calls.some((t) => t.includes("Important point."))).toBe(true);
    });

    it("strips inline code before speaking", () => {
      const { rerender } = renderTTS("");

      act(() => {
        rerender({ text: "Use `Array.prototype.map` to iterate." });
      });

      expect(mockSpeak).toHaveBeenCalledTimes(1);
      const utterance = mockSpeak.mock.calls[0][0] as MockSpeechSynthesisUtterance;
      expect(utterance.text).not.toContain("`");
      expect(utterance.text).toContain("Array.prototype.map");
    });

    it("does not speak a segment that is empty after stripping markdown", () => {
      const { rerender } = renderTTS("");

      // Bold wrapping only whitespace → strips to "" → nothing to speak
      act(() => {
        rerender({ text: "**   **" });
      });

      act(() => {
        rerender({ text: "" });
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

    it("does not speak when muted, even with complete sentences", () => {
      localStorage.setItem("tts_muted", "1");
      const { rerender } = renderTTS("");

      act(() => {
        rerender({ text: "A complete sentence." });
      });

      expect(mockSpeak).not.toHaveBeenCalled();
    });
  });

  describe("cancel()", () => {
    it("calls speechSynthesis.cancel and resets tracking state", () => {
      const { result, rerender } = renderTTS("");

      // Build up some spoken state
      act(() => {
        rerender({ text: "First." });
      });

      mockCancel.mockClear();
      mockSpeak.mockClear();

      act(() => {
        result.current.cancel();
      });

      expect(mockCancel).toHaveBeenCalled();

      // After cancel, a new stream should restart from position 0
      act(() => {
        rerender({ text: "" });
      });

      act(() => {
        rerender({ text: "Fresh start." });
      });

      expect(mockSpeak).toHaveBeenCalledTimes(1);
    });
  });

  describe("unmount cleanup", () => {
    it("cancels speech synthesis when the component unmounts", () => {
      const { unmount } = renderTTS("Ongoing stream");

      mockCancel.mockClear();
      unmount();

      expect(mockCancel).toHaveBeenCalled();
    });
  });

  describe("speak() error resilience", () => {
    it("continues speaking subsequent sentences after speak() throws", () => {
      mockSpeak
        .mockImplementationOnce(() => { throw new Error("NotAllowedError"); })
        .mockImplementation(() => {});

      const { rerender } = renderTTS("");

      act(() => {
        rerender({ text: "First sentence. Second sentence." });
      });

      // First call threw, second should still be attempted
      expect(mockSpeak).toHaveBeenCalledTimes(2);
      const second = mockSpeak.mock.calls[1][0] as MockSpeechSynthesisUtterance;
      expect(second.text).toBe("Second sentence.");
    });
  });

  describe("enabled guard", () => {
    it("does not speak when enabled is false, even with complete sentences", () => {
      renderHook(() =>
        useStreamingTTS({ currentStreamedText: "A complete sentence.", enabled: false })
      );

      expect(mockSpeak).not.toHaveBeenCalled();
    });

    it("does not flush tail on stream reset when enabled is false", () => {
      const { rerender } = renderHook(
        ({ text, enabled }: { text: string; enabled: boolean }) =>
          useStreamingTTS({ currentStreamedText: text, enabled }),
        { initialProps: { text: "No punctuation", enabled: false } }
      );

      act(() => {
        rerender({ text: "", enabled: false });
      });

      expect(mockSpeak).not.toHaveBeenCalled();
    });
  });
});
