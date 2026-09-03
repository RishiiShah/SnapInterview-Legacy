// @vitest-environment jsdom

import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  routerPush: vi.fn(),
  useMediaPermissions: vi.fn(),
  useSpeechRecognition: vi.fn(),
  useVideoRecording: vi.fn(),
  useChatSession: vi.fn(),
  useStreamingTTS: vi.fn(),
  useAudioAnalyser: vi.fn(),
  getInterviewBlockReason: vi.fn(),
  finalizeInterviewUpload: vi.fn(),
  scheduleInterviewFinalize: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.routerPush }),
}));

vi.mock("@/hooks/useMediaPermissions", () => ({
  useMediaPermissions: mocks.useMediaPermissions,
}));

vi.mock("@/hooks/useSpeechRecognition", () => ({
  useSpeechRecognition: mocks.useSpeechRecognition,
}));

vi.mock("@/hooks/useVideoRecording", () => ({
  useVideoRecording: mocks.useVideoRecording,
}));

vi.mock("@/hooks/useChatSession", () => ({
  useChatSession: mocks.useChatSession,
}));

vi.mock("@/hooks/useStreamingTTS", () => ({
  useStreamingTTS: mocks.useStreamingTTS,
}));

vi.mock("@/hooks/useAudioAnalyser", () => ({
  useAudioAnalyser: mocks.useAudioAnalyser,
}));

vi.mock("@/lib/interview/browser-block", () => ({
  getInterviewBlockReason: mocks.getInterviewBlockReason,
}));

vi.mock("@/lib/video/upload-service", () => ({
  finalizeInterviewUpload: mocks.finalizeInterviewUpload,
}));

vi.mock("@/lib/video/background-finalize", () => ({
  scheduleInterviewFinalize: mocks.scheduleInterviewFinalize,
}));

import { useInterviewPageController } from "./useInterviewPageController";

function okJson(body: Record<string, unknown> = {}) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

function setupHookMocks({
  chatMessages = [],
  startRecording = vi.fn().mockResolvedValue(true),
  stopVideoRecording = vi.fn().mockResolvedValue(null),
}: {
  chatMessages?: Array<{ role: "user" | "assistant" | "system"; content: string }>;
  startRecording?: ReturnType<typeof vi.fn>;
  stopVideoRecording?: ReturnType<typeof vi.fn>;
} = {}) {
  const stopRecording = vi.fn();
  const stopStream = vi.fn();
  const mountVideoNode = vi.fn();
  const requestPermissions = vi.fn().mockResolvedValue(undefined);
  const stream = { id: "mock-stream" } as MediaStream;

  mocks.useMediaPermissions.mockReturnValue({
    stream,
    requestPermissions,
    isMicEnabled: true,
    stopStream,
    mountVideoNode,
  });
  mocks.useSpeechRecognition.mockReturnValue({
    finalTranscriptBlock: "",
    interimTranscript: "",
    volatileTranscript: "",
    stopRecording,
  });
  mocks.useVideoRecording.mockReturnValue({
    startRecording,
    stopVideoRecording,
  });
  mocks.useChatSession.mockReturnValue({
    messages: chatMessages,
    currentStreamedText: "",
    lastCompletedAiText: "",
    isThinking: false,
  });
  mocks.useStreamingTTS.mockReturnValue({ isSpeaking: false, warmup: vi.fn(), cancel: vi.fn() });
  mocks.useAudioAnalyser.mockReturnValue({ level: 0 });
  mocks.getInterviewBlockReason.mockResolvedValue(null);
  mocks.scheduleInterviewFinalize.mockResolvedValue({ type: "ok" });

  return {
    startRecording,
    stopVideoRecording,
    stopRecording,
    stopStream,
    stream,
    requestPermissions,
  };
}

function renderScrollController(interviewId: string, frameId: number) {
  setupHookMocks();
  const chatState = {
    messages: [] as Array<{ role: "ai" | "user"; text: string }>,
    currentStreamedText: "",
    lastCompletedAiText: "",
    isThinking: true,
    codingChallenge: null,
  };
  const speechState = {
    finalTranscriptBlock: "",
    interimTranscript: "",
    volatileTranscript: "",
    stopRecording: vi.fn(),
  };
  mocks.useChatSession.mockImplementation(() => chatState);
  mocks.useSpeechRecognition.mockImplementation(() => speechState);

  let scheduledFrame: FrameRequestCallback | null = null;
  const requestAnimationFrame = vi.fn((callback: FrameRequestCallback) => {
    scheduledFrame = callback;
    return frameId;
  });
  const cancelAnimationFrame = vi.fn();
  vi.stubGlobal("requestAnimationFrame", requestAnimationFrame);
  vi.stubGlobal("cancelAnimationFrame", cancelAnimationFrame);

  const hook = renderHook(() => useInterviewPageController({ interviewId }));
  const bottom = document.createElement("div");
  const scrollIntoView = vi.fn();
  bottom.scrollIntoView = scrollIntoView;
  act(() => {
    hook.result.current.chatScrollContainerRef.current = document.createElement("div");
    hook.result.current.chatBottomRef.current = bottom;
  });

  return {
    ...hook,
    chatState,
    speechState,
    requestAnimationFrame,
    cancelAnimationFrame,
    scrollIntoView,
    runScheduledFrame: () => act(() => scheduledFrame?.(16)),
  };
}

describe("useInterviewPageController", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(okJson({ questionCount: 10, persona: "balanced" })));
    localStorage.clear();
    sessionStorage.clear();
    mocks.routerPush.mockReset();
    mocks.useMediaPermissions.mockReset();
    mocks.useSpeechRecognition.mockReset();
    mocks.useVideoRecording.mockReset();
    mocks.useChatSession.mockReset();
    mocks.useStreamingTTS.mockReset();
    mocks.useAudioAnalyser.mockReset();
    mocks.getInterviewBlockReason.mockReset();
    mocks.finalizeInterviewUpload.mockReset();
    mocks.scheduleInterviewFinalize.mockReset();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("opens a resume modal when another interview is active", async () => {
    setupHookMocks();
    localStorage.setItem("active_interview_id", "other-interview");

    const { result } = renderHook(() => useInterviewPageController({ interviewId: "current-interview" }));

    await waitFor(() => expect(result.current.modal.isOpen).toBe(true));
    expect(result.current.modal.title).toBe("Active Interview Found");

    act(() => {
      result.current.modal.onConfirm?.();
    });

    expect(mocks.routerPush).toHaveBeenCalledWith("/interview/other-interview");
  });

  it("warms the voice engine in the same user action as requesting media permission", async () => {
    const { requestPermissions } = setupHookMocks();
    const warmup = vi.fn();
    mocks.useStreamingTTS.mockReturnValue({ isSpeaking: false, warmup });

    const { result } = renderHook(() => useInterviewPageController({ interviewId: "interview-voice" }));

    await act(async () => {
      await result.current.requestPermissions();
    });

    expect(warmup).toHaveBeenCalledTimes(1);
    expect(requestPermissions).toHaveBeenCalledTimes(1);
    expect(warmup.mock.invocationCallOrder[0]).toBeLessThan(requestPermissions.mock.invocationCallOrder[0]!);
  });

  it("uses pending session metadata without requesting a session that does not exist yet", async () => {
    setupHookMocks();
    sessionStorage.setItem("pending_interview_interview-pending", JSON.stringify({
      questionCount: 5,
      persona: "strict",
    }));

    const { result } = renderHook(() => useInterviewPageController({ interviewId: "interview-pending" }));

    await waitFor(() => expect(result.current.totalQuestions).toBe(5));
    expect(result.current.tts).toBeDefined();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("sets the coding interview type from pending metadata before the challenge streams", async () => {
    setupHookMocks();
    sessionStorage.setItem("pending_interview_interview-coding", JSON.stringify({
      type: "coding-algorithms",
    }));

    const { result } = renderHook(() => useInterviewPageController({ interviewId: "interview-coding" }));

    await waitFor(() => expect(result.current.interviewType).toBe("coding-algorithms"));
    expect(fetch).not.toHaveBeenCalled();
  });

  it("loads metadata for an existing interview after pre-join has rendered", async () => {
    setupHookMocks();
    vi.mocked(fetch).mockResolvedValue(okJson({
      questionCount: 5,
      persona: "strict",
      type: "coding-algorithms",
    }));

    const { result } = renderHook(() => useInterviewPageController({ interviewId: "interview-hydrated" }));

    await waitFor(() => {
      expect(result.current.totalQuestions).toBe(5);
      expect(result.current.interviewType).toBe("coding-algorithms");
    });
    expect(fetch).toHaveBeenCalledWith("/api/interview/session?interviewId=interview-hydrated");
  });

  it("blocks an expired interview and clears only its matching active hint", async () => {
    setupHookMocks();
    localStorage.setItem("active_interview_id", "interview-expired");
    vi.mocked(fetch).mockResolvedValue(new Response(
      JSON.stringify({ error: "This interview expired after 24 hours." }),
      { status: 410, headers: { "Content-Type": "application/json" } },
    ));

    const { result } = renderHook(() => useInterviewPageController({ interviewId: "interview-expired" }));

    await waitFor(() => expect(result.current.resumeExpired).toBe(true));
    expect(localStorage.getItem("active_interview_id")).toBeNull();

    await act(async () => {
      await result.current.handlePermissionsGranted();
    });
    expect(result.current.interviewStarted).toBe(false);
  });

  it("waits for session metadata before starting recording and entering the interview", async () => {
    let resolveMetadata: ((response: Response) => void) | undefined;
    const metadata = new Promise<Response>((resolve) => {
      resolveMetadata = resolve;
    });
    const startRecording = vi.fn().mockResolvedValue(true);
    setupHookMocks({ startRecording });
    vi.mocked(fetch).mockReturnValue(metadata);

    const { result } = renderHook(() => useInterviewPageController({ interviewId: "interview-existing" }));

    await waitFor(() => expect(fetch).toHaveBeenCalledWith("/api/interview/session?interviewId=interview-existing"));

    void result.current.handlePermissionsGranted();

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(result.current.interviewStarted).toBe(false);

    resolveMetadata?.(okJson({ questionCount: 5, persona: "strict", type: "coding-algorithms" }));

    await waitFor(() => {
      expect(result.current.interviewStarted).toBe(true);
      expect(result.current.totalQuestions).toBe(5);
      expect(result.current.interviewType).toBe("coding-algorithms");
    });
  });

  it("persists pending interview config before entering the interview", async () => {
    const { startRecording } = setupHookMocks();
    sessionStorage.setItem("pending_interview_interview-1", JSON.stringify({
      role: "Frontend Developer",
      type: "technical",
      difficulty: "hard",
      questionCount: 5,
    }));
    vi.mocked(fetch).mockImplementation(async (url, init) => {
      if (url === "/api/interview/session" && init?.method === "POST") {
        return okJson({});
      }
      return okJson({ questionCount: 5, persona: "strict" });
    });

    const { result } = renderHook(() => useInterviewPageController({ interviewId: "interview-1" }));

    await act(async () => {
      await result.current.handlePermissionsGranted();
    });

    expect(startRecording).toHaveBeenCalledWith(expect.objectContaining({ id: "mock-stream" }));
    expect(fetch).toHaveBeenCalledWith("/api/interview/session", expect.objectContaining({
      method: "POST",
      body: JSON.stringify({
        role: "Frontend Developer",
        type: "technical",
        difficulty: "hard",
        questionCount: 5,
        id: "interview-1",
      }),
    }));
    expect(sessionStorage.getItem("pending_interview_interview-1")).toBeNull();
    expect(result.current.showPreJoin).toBe(false);
    expect(result.current.interviewStarted).toBe(true);
  });

  it("stops recording and shows an error when pending interview persistence fails", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const { stopVideoRecording } = setupHookMocks();
    sessionStorage.setItem("pending_interview_interview-2", JSON.stringify({
      role: "Backend Developer",
      type: "behavioral",
      difficulty: "medium",
    }));
    vi.mocked(fetch).mockImplementation(async (url, init) => {
      if (url === "/api/interview/session" && init?.method === "POST") {
        return new Response("{}", { status: 500 });
      }
      return okJson({});
    });

    const { result } = renderHook(() => useInterviewPageController({ interviewId: "interview-2" }));

    await act(async () => {
      await result.current.handlePermissionsGranted();
    });

    expect(stopVideoRecording).toHaveBeenCalledTimes(1);
    expect(result.current.modal).toMatchObject({
      isOpen: true,
      title: "Connection Error",
      variant: "danger",
    });
    expect(result.current.showPreJoin).toBe(true);
    expect(result.current.interviewStarted).toBe(false);

    consoleError.mockRestore();
  });

  it("finalizes an answered interview as completed and navigates to analytics", async () => {
    const { stopRecording, stopStream } = setupHookMocks({
      chatMessages: [{ role: "user", content: "My answer" }],
    });
    localStorage.setItem("active_interview_id", "interview-3");

    const { result } = renderHook(() => useInterviewPageController({ interviewId: "interview-3" }));

    await act(async () => {
      await result.current.handleExitInterview({ skipConfirmation: true });
    });

    expect(localStorage.getItem("active_interview_id")).toBeNull();
    expect(stopRecording).toHaveBeenCalledTimes(1);
    expect(stopStream).toHaveBeenCalledTimes(1);
    expect(mocks.scheduleInterviewFinalize).toHaveBeenCalledWith({
      interviewId: "interview-3",
      status: "COMPLETED",
      stopVideoRecording: expect.any(Function),
    });
    expect(mocks.routerPush).toHaveBeenCalledWith("/analytics");
  });

  it("exits through finalize when the interview completes", async () => {
    const stopVideoRecording = vi.fn().mockResolvedValue(null);
    setupHookMocks({ stopVideoRecording });

    const chatOptions: { setInterviewDone?: (done: boolean) => void } = {};
    mocks.useChatSession.mockImplementation((options: { setInterviewDone: (done: boolean) => void }) => {
      chatOptions.setInterviewDone = options.setInterviewDone;
      return {
        messages: [],
        currentStreamedText: "",
        lastCompletedAiText: "",
        isThinking: false,
      };
    });
    const cancel = vi.fn();
    mocks.useStreamingTTS.mockReturnValue({ isSpeaking: false, warmup: vi.fn(), cancel });

    renderHook(() => useInterviewPageController({ interviewId: "interview-done" }));

    await act(async () => {
      chatOptions.setInterviewDone?.(true);
    });

    expect(cancel).toHaveBeenCalled();
    expect(mocks.scheduleInterviewFinalize).toHaveBeenCalled();
    expect(mocks.routerPush).toHaveBeenCalledWith("/analytics");
  });

  it("surfaces a recording-save error instead of navigating away", async () => {
    setupHookMocks();
    mocks.scheduleInterviewFinalize.mockResolvedValue({
      type: "error",
      message: "Upload failed",
    });

    const { result } = renderHook(() => useInterviewPageController({ interviewId: "interview-fail" }));

    await act(async () => {
      await result.current.handleExitInterview({ skipConfirmation: true });
    });

    expect(mocks.routerPush).not.toHaveBeenCalled();
    expect(result.current.modal).toMatchObject({
      isOpen: true,
      title: "Recording Save Failed",
      confirmLabel: "Proceed to Analytics",
    });
  });

  it("routes countdown expiration through the existing finalization path", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-17T12:00:00.000Z"));
    setupHookMocks();
    sessionStorage.setItem(
      "pending_interview_interview-timeout",
      JSON.stringify({
        role: "Backend Engineer",
        type: "coding-algorithms",
        difficulty: "medium",
        durationMinutes: 1,
      }),
    );

    const { result } = renderHook(() =>
      useInterviewPageController({ interviewId: "interview-timeout" }),
    );

    await act(async () => {
      await result.current.handlePermissionsGranted();
    });

    await act(async () => {
      vi.advanceTimersByTime(120_000);
    });

    expect(mocks.scheduleInterviewFinalize).toHaveBeenCalledOnce();
    expect(mocks.routerPush).toHaveBeenCalledWith("/analytics");
  });

  it("coalesces streaming transcript scrolls into one animation frame", () => {
    const harness = renderScrollController("interview-scroll", 17);

    act(() => {
      harness.chatState.currentStreamedText = "First";
      harness.rerender();
    });
    act(() => {
      harness.chatState.currentStreamedText = "First chunk";
      harness.rerender();
    });

    expect(harness.requestAnimationFrame).toHaveBeenCalledOnce();
    expect(harness.scrollIntoView).not.toHaveBeenCalled();

    harness.runScheduledFrame();
    expect(harness.scrollIntoView).toHaveBeenCalledOnce();
    expect(harness.scrollIntoView).toHaveBeenCalledWith({
      behavior: "auto",
      block: "end",
    });
  });

  it("re-arms transcript scrolling after the scheduled frame completes", () => {
    const harness = renderScrollController("interview-scroll-rearm", 18);

    act(() => {
      harness.chatState.currentStreamedText = "First";
      harness.rerender();
    });
    harness.runScheduledFrame();
    expect(harness.requestAnimationFrame).toHaveBeenCalledOnce();
    expect(harness.scrollIntoView).toHaveBeenCalledOnce();

    act(() => {
      harness.chatState.currentStreamedText = "Second";
      harness.rerender();
    });
    expect(harness.requestAnimationFrame).toHaveBeenCalledTimes(2);

    harness.runScheduledFrame();
    expect(harness.scrollIntoView).toHaveBeenCalledTimes(2);
  });

  it("uses the latest scroll behavior when streaming completes in the same frame", () => {
    const harness = renderScrollController("interview-scroll-complete", 19);

    act(() => {
      harness.chatState.currentStreamedText = "Complete me";
      harness.rerender();
    });
    act(() => {
      harness.chatState.currentStreamedText = "";
      harness.chatState.messages = [{ role: "ai", text: "Complete me" }];
      harness.chatState.isThinking = false;
      harness.rerender();
    });

    expect(harness.requestAnimationFrame).toHaveBeenCalledOnce();
    harness.runScheduledFrame();
    expect(harness.scrollIntoView).toHaveBeenCalledWith({
      behavior: "smooth",
      block: "end",
    });
  });

  it("cancels its pending transcript scroll only when unmounted", () => {
    const harness = renderScrollController("interview-scroll-cleanup", 23);

    act(() => {
      harness.chatState.currentStreamedText = "First";
      harness.rerender();
    });
    act(() => {
      harness.chatState.currentStreamedText = "First chunk";
      harness.rerender();
    });

    expect(harness.requestAnimationFrame).toHaveBeenCalledOnce();
    expect(harness.cancelAnimationFrame).not.toHaveBeenCalled();

    harness.unmount();

    expect(harness.cancelAnimationFrame).toHaveBeenCalledOnce();
    expect(harness.cancelAnimationFrame).toHaveBeenCalledWith(23);
  });

});
