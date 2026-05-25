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
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.routerPush }),
}));

vi.mock("@/lib/useMediaPermissions", () => ({
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

import { useInterviewPageController } from "./useInterviewPageController";

function okJson(body: Record<string, unknown> = {}) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

function setupHookMocks({
  chatMessages = [],
  startScreenRecording = vi.fn().mockResolvedValue(true),
  stopVideoRecording = vi.fn().mockResolvedValue(null),
}: {
  chatMessages?: Array<{ role: "user" | "assistant" | "system"; content: string }>;
  startScreenRecording?: ReturnType<typeof vi.fn>;
  stopVideoRecording?: ReturnType<typeof vi.fn>;
} = {}) {
  const stopRecording = vi.fn();
  const stopStream = vi.fn();
  const mountVideoNode = vi.fn();
  const stream = { id: "mock-stream" } as MediaStream;

  mocks.useMediaPermissions.mockReturnValue({
    stream,
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
    startScreenRecording,
    stopVideoRecording,
  });
  mocks.useChatSession.mockReturnValue({
    messages: chatMessages,
    currentStreamedText: "",
    lastCompletedAiText: "",
    isThinking: false,
  });
  mocks.useStreamingTTS.mockReturnValue({ isSpeaking: false });
  mocks.useAudioAnalyser.mockReturnValue({ level: 0 });
  mocks.getInterviewBlockReason.mockResolvedValue(null);
  mocks.finalizeInterviewUpload.mockResolvedValue({ type: "ok" });

  return {
    startScreenRecording,
    stopVideoRecording,
    stopRecording,
    stopStream,
    stream,
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
  });

  afterEach(() => {
    cleanup();
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

  it("persists pending interview config before entering the interview", async () => {
    const { startScreenRecording } = setupHookMocks();
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

    expect(startScreenRecording).toHaveBeenCalledWith(expect.objectContaining({ id: "mock-stream" }));
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

  it("finalizes an answered interview as completed and navigates to recordings", async () => {
    const { stopRecording, stopStream, stopVideoRecording } = setupHookMocks({
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
    expect(mocks.finalizeInterviewUpload).toHaveBeenCalledWith({
      interviewId: "interview-3",
      status: "COMPLETED",
      stopVideoRecording,
    });
    expect(mocks.routerPush).toHaveBeenCalledWith("/analytics");
  });
});
