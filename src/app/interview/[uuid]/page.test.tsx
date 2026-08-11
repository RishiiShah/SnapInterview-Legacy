import React from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  getServerAuthSession: vi.fn(),
  getInterviewSessionState: vi.fn(),
  redirect: vi.fn(),
  routerPush: vi.fn(),
  useInterviewPageController: vi.fn(),
}));

vi.mock("@/lib/server-auth", () => ({
  getServerAuthSession: mocks.getServerAuthSession,
}));

vi.mock("@/services/interview-service", () => ({
  getInterviewSessionState: mocks.getInterviewSessionState,
}));

vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
  useParams: () => ({ uuid: "interview-1" }),
  useRouter: () => ({ push: mocks.routerPush }),
}));

vi.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/components/interview/PreJoinScreen", () => ({
  default: () => <div data-testid="pre-join" />,
}));

vi.mock("@/components/interview/ActiveInterviewScreen", () => ({
  default: () => <div data-testid="active-interview" />,
}));

vi.mock("@/components/ui/Modal", () => ({
  default: () => <div data-testid="modal" />,
}));

vi.mock("@/hooks/useInterviewPageController", () => ({
  useInterviewPageController: mocks.useInterviewPageController,
}));

import InterviewPage from "./page";

const pageProps = {
  params: Promise.resolve({ uuid: "interview-1" }),
};

function mockControllerState() {
  mocks.useInterviewPageController.mockReturnValue({
    showPreJoin: true,
    interviewStarted: false,
    interviewDone: false,
    isUploading: false,
    totalQuestions: 10,
    joinBlockedReason: null,
    answeredQuestions: 0,
    questionProgressPercent: 0,
    chatScrollContainerRef: { current: null },
    chatBottomRef: { current: null },
    speech: {
      stopRecording: vi.fn(),
      interimTranscript: "",
      volatileTranscript: "",
      isRecording: false,
      hasSupport: true,
      speechError: null,
      toggleRecording: vi.fn(),
    },
    chat: {
      messages: [],
      currentStreamedText: "",
      isThinking: false,
      sendMessage: vi.fn(),
    },
    tts: {
      cancel: vi.fn(),
    },
    media: {
      stopStream: vi.fn(),
      hasPermission: true,
      isLoading: false,
      error: null,
      requestPermissions: vi.fn(),
      videoRef: { current: null },
      audioInputs: [],
      audioOutputs: [],
      videoInputs: [],
      isMicEnabled: true,
      isCameraEnabled: true,
      selectedAudioInputId: "",
      selectedAudioOutputId: "",
      selectedVideoInputId: "",
      selectAudioInput: vi.fn(),
      selectAudioOutput: vi.fn(),
      selectVideoInput: vi.fn(),
      toggleMic: vi.fn(),
      toggleCamera: vi.fn(),
      stream: null,
    },
    videoRecording: {
      isRecordingVideo: false,
    },
    audioLevels: { level: 0 },
    handlePermissionsGranted: vi.fn(),
    handleExitInterview: vi.fn(),
    handleVideoMount: vi.fn(),
    modal: {
      isOpen: false,
      onConfirm: undefined,
      title: "",
      description: "",
      variant: "default",
      confirmLabel: undefined,
      cancelLabel: undefined,
    },
    closeModal: vi.fn(),
  });
}

describe("InterviewPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getInterviewSessionState.mockResolvedValue(null);
    mockControllerState();
  });

  it("redirects unauthenticated users to login from the server guard", async () => {
    const redirectError = new Error("redirect");
    mocks.getServerAuthSession.mockResolvedValue(null);
    mocks.redirect.mockImplementation(() => {
      throw redirectError;
    });

    await expect(Promise.resolve().then(() => InterviewPage(pageProps))).rejects.toBe(redirectError);

    expect(mocks.getServerAuthSession).toHaveBeenCalledOnce();
    expect(mocks.redirect).toHaveBeenCalledWith("/login");
  });

  it("checks the server auth session before rendering the interview experience", async () => {
    mocks.getServerAuthSession.mockResolvedValue({
      session: { userId: "user-1" },
    });
    mocks.getInterviewSessionState.mockResolvedValue({
      id: "interview-1",
      questionCount: 5,
      persona: "strict",
      type: "coding-algorithms",
    });

    const result = await InterviewPage(pageProps);

    expect(mocks.getServerAuthSession).toHaveBeenCalledOnce();
    expect(mocks.getInterviewSessionState).toHaveBeenCalledWith({
      interviewId: "interview-1",
      userId: "user-1",
    });
    expect(mocks.redirect).not.toHaveBeenCalled();
    expect(React.isValidElement(result)).toBe(true);
    expect((result as React.ReactElement<{ initialSessionMeta?: unknown }>).props.initialSessionMeta).toEqual({
      id: "interview-1",
      questionCount: 5,
      persona: "strict",
      type: "coding-algorithms",
    });
  });
});
