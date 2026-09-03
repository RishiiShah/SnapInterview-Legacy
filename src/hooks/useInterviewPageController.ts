import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useMediaPermissions } from "@/hooks/useMediaPermissions";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { useVideoRecording } from "@/hooks/useVideoRecording";
import { useChatSession } from "@/hooks/useChatSession";
import { useStreamingTTS } from "@/hooks/useStreamingTTS";
import { useAudioAnalyser } from "@/hooks/useAudioAnalyser";
import { useInterviewCountdown } from "@/hooks/useInterviewCountdown";
import { getInterviewBlockReason, type BrowserBlockResult } from "@/lib/interview/browser-block";
import { scheduleInterviewFinalize } from "@/lib/video/background-finalize";
import { addPendingInterviewFinalize } from "@/lib/interview/finalize-pending-client";
import type { InterviewCompletionStatus } from "@/lib/video/upload-service";
import { coerceInterviewType, type InterviewType } from "@/lib/interview/domain";
import type { InterviewWhiteboardRef } from "@/components/interview/InterviewWhiteboard";

type UseInterviewPageControllerOptions = {
  interviewId: string;
};

export function useInterviewPageController({
  interviewId,
}: UseInterviewPageControllerOptions) {
  const router = useRouter();

  const [showPreJoin, setShowPreJoin] = useState(true);
  const [interviewStarted, setInterviewStarted] = useState(false);
  const [interviewDone, setInterviewDone] = useState(false);
  const [isUploading] = useState(false);
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [sessionCreatedAt, setSessionCreatedAt] = useState<string | null>(null);
  const [totalQuestions, setTotalQuestions] = useState(10);
  const [persona, setPersona] = useState<string | null>(null);
  const [interviewType, setInterviewType] = useState<InterviewType | null>(null);
  const [joinBlockedReason, setJoinBlockedReason] = useState<BrowserBlockResult>(null);
  const [resumeExpired, setResumeExpired] = useState(false);

  const [modal, setModal] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    onConfirm?: () => void;
    onCancel?: () => void;
    variant?: "danger" | "info" | "warning";
    confirmLabel?: string;
    cancelLabel?: string;
  }>({
    isOpen: false,
    title: "",
    description: "",
  });

  const closeModal = useCallback(() => setModal((prev) => ({ ...prev, isOpen: false })), []);

  const interviewDoneRef = useRef(false);
  const isExitingRef = useRef(false);
  const hasCheckedResumeRef = useRef(false);
  const isMountedRef = useRef(true);
  const resumeExpiredRef = useRef(false);
  const autoExitScheduledRef = useRef(false);
  const sessionMetaPromiseRef = useRef<Promise<void> | null>(null);
  const chatMessagesRef = useRef<typeof chat.messages>([]);
  const handleExitInterviewRef = useRef<(opts?: { skipConfirmation?: boolean }) => Promise<void>>(async () => {});
  const onRecordingEndedRef = useRef<() => void>(() => {});

  useEffect(() => {
    if (typeof window === "undefined" || hasCheckedResumeRef.current) return;
    hasCheckedResumeRef.current = true;

    const activeId = localStorage.getItem("active_interview_id");
    if (activeId && activeId !== interviewId) {

      setModal({
        isOpen: true,
        title: "Active Interview Found",
        description: "You have another interview in progress. Would you like to resume it or start this new one?",
        confirmLabel: "Resume Other",
        cancelLabel: "Start New",
        onConfirm: () => {
          closeModal();
          router.push(`/interview/${activeId}`);
        },
        variant: "info",
      });
    } else if (activeId === interviewId) {
      // Auto-resume logic: if it was started, we should probably skip pre-join
      // But we need media permissions again anyway, so maybe just stay on pre-join
      // and let the user click "Join Now" again.
    }
  }, [interviewId, router, closeModal]);

  useEffect(() => {
    if (interviewStarted) {
      localStorage.setItem("active_interview_id", interviewId);
    }
  }, [interviewStarted, interviewId]);
  const chatScrollContainerRef = useRef<HTMLDivElement | null>(null);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);
  const chatScrollFrameRef = useRef<number | null>(null);
  const chatScrollBehaviorRef = useRef<ScrollBehavior>("smooth");
  const whiteboardRef = useRef<InterviewWhiteboardRef | null>(null);

  const media = useMediaPermissions();

  const speech = useSpeechRecognition({ audioDeviceId: media.selectedAudioInputId });

  const videoRecording = useVideoRecording({
    interviewId,
    onRecordingEnded: () => {
      onRecordingEndedRef.current();
    },
  });
  const { startRecording, stopVideoRecording } = videoRecording;
  const pendingVideoStopRef = useRef<ReturnType<typeof stopVideoRecording> | null>(null);

  const stopVideoRecordingForFinalize = useCallback(() => {
    if (!pendingVideoStopRef.current) {
      pendingVideoStopRef.current = stopVideoRecording();
    }
    return pendingVideoStopRef.current;
  }, [stopVideoRecording]);

  const getWhiteboardExport = useCallback(async () => {
    if (whiteboardRef.current?.exportBoard) {
      return whiteboardRef.current.exportBoard();
    }
    return null;
  }, []);

  const chat = useChatSession({
    interviewId,
    interviewStarted,
    interviewDone,
    finalTranscriptBlock: speech.finalTranscriptBlock,
    setInterviewDone,
    getWhiteboardExport,
  });

  const tts = useStreamingTTS({
    streamingText: chat.currentStreamedText,
    completedText: chat.lastCompletedAiText,
    enabled: interviewStarted && !interviewDone,
    persona,
  });
  const { cancel: cancelTts, warmup: warmupTts } = tts;

  const requestPermissions = useCallback(() => {
    warmupTts();
    return media.requestPermissions();
  }, [media, warmupTts]);

  const audioLevels = useAudioAnalyser(media.stream, media.isMicEnabled);

  const handleStartInterview = useCallback(() => {
    if (resumeExpiredRef.current) return;
    setInterviewStarted(true);
    localStorage.setItem("active_interview_id", interviewId);
  }, [interviewId]);

  const applySessionMeta = useCallback((data: any) => {
    if (!data) return;
    if (typeof data.durationMinutes === "number") {
      setDurationMinutes(data.durationMinutes);
    }
    if (typeof data.createdAt === "string") {
      setSessionCreatedAt(data.createdAt);
    }
    if (typeof data.questionCount === "number") {
      setTotalQuestions(data.questionCount);
    }
    if (typeof data.persona === "string") {
      setPersona(data.persona);
    }
    setInterviewType(coerceInterviewType(data.type));
  }, []);

  const loadSessionMeta = useCallback(() => {
    if (sessionMetaPromiseRef.current) return sessionMetaPromiseRef.current;

    const loadPromise = (async () => {
      const pendingRaw = sessionStorage.getItem(`pending_interview_${interviewId}`);
      if (pendingRaw) {
        try {
          applySessionMeta(JSON.parse(pendingRaw));
          return;
        } catch {
          sessionStorage.removeItem(`pending_interview_${interviewId}`);
        }
      }

      const res = await fetch(`/api/interview/session?interviewId=${encodeURIComponent(interviewId)}`);
      if (res.status === 410) {
        resumeExpiredRef.current = true;
        if (isMountedRef.current) {
          setResumeExpired(true);
        }
        if (localStorage.getItem("active_interview_id") === interviewId) {
          localStorage.removeItem("active_interview_id");
        }
        return;
      }
      if (!res.ok) {
        throw new Error(`Failed to load interview session metadata (${res.status})`);
      }

      applySessionMeta(await res.json());
    })();

    sessionMetaPromiseRef.current = loadPromise;
    void loadPromise.catch(() => {
      if (sessionMetaPromiseRef.current === loadPromise) {
        sessionMetaPromiseRef.current = null;
      }
    });
    return loadPromise;
  }, [applySessionMeta, interviewId]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    let isCancelled = false;

    const detectUnsupportedBrowser = async () => {
      const result = await getInterviewBlockReason();
      if (!isCancelled) {
        setJoinBlockedReason(result);
      }
    };

    void detectUnsupportedBrowser();

    return () => {
      isCancelled = true;
    };
  }, []);

  useEffect(() => {
    interviewDoneRef.current = interviewDone;
  }, [interviewDone]);

  useEffect(() => {
    chatMessagesRef.current = chat.messages;
  }, [chat.messages]);

  const handlePermissionsGranted = useCallback(async () => {
    if (resumeExpiredRef.current) return;
    if (!media.stream) return;

    const pendingRaw = sessionStorage.getItem(`pending_interview_${interviewId}`);
    let sessionPromise: Promise<void>;
    let payload: Record<string, unknown> | null = null;

    if (pendingRaw) {
      try {
        payload = JSON.parse(pendingRaw);
      } catch {
        sessionStorage.removeItem(`pending_interview_${interviewId}`);
      }
    }

    if (payload) {
      payload.id = interviewId;
      setInterviewType(coerceInterviewType(payload.type as string | undefined));
      sessionPromise = fetch("/api/interview/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).then(res => {
        if (!res.ok) throw new Error("Server rejected session creation");
        sessionStorage.removeItem(`pending_interview_${interviewId}`);
      });
    } else {
      sessionPromise = loadSessionMeta();
    }

    try {
      await sessionPromise;
    } catch (err) {
      console.error("Failed to persist session to DB", err);
      try {
        await stopVideoRecording();
      } catch (stopError) {
        console.error("Failed to stop recording after session persistence failure", stopError);
      }
      setModal({
        isOpen: true,
        title: "Connection Error",
        description: "Failed to establish interview session. Please try again.",
        variant: "danger",
      });
      return;
    }

    const started = await startRecording(media.stream);
    if (!started) {
      if (resumeExpiredRef.current) return;
      setModal({
        isOpen: true,
        title: "Recording Failed",
        description: "Could not start recording. Please check your camera/mic permissions and try again.",
        variant: "warning",
      });
      return;
    }

    setShowPreJoin(false);
    setInterviewStarted(true);
  }, [media.stream, startRecording, stopVideoRecording, interviewId, loadSessionMeta]);

  const handleExitInterview = useCallback(
    async ({ skipConfirmation = false }: { skipConfirmation?: boolean } = {}) => {
      if (!skipConfirmation && !interviewDoneRef.current) {
        setModal({
          isOpen: true,
          title: "Exit Interview",
          description: "Are you sure you want to exit? Your recording will be saved and you can view it later.",
          onConfirm: () => {
            closeModal();
            void handleExitInterviewRef.current({ skipConfirmation: true });
          },
          variant: "warning",
          confirmLabel: "Exit Interview",
        });
        return;
      }

      if (isExitingRef.current) return;
      isExitingRef.current = true;

      localStorage.removeItem("active_interview_id");
      speech.stopRecording();

      const userAnswerCount = chatMessagesRef.current.filter((m) => m.role === "user").length;
      const interviewStatus: InterviewCompletionStatus =
        interviewDoneRef.current || userAnswerCount > 0 ? "COMPLETED" : "ABORTED";

      addPendingInterviewFinalize(interviewId);

      try {
        const finalizeResult = await scheduleInterviewFinalize({
          interviewId,
          status: interviewStatus,
          stopVideoRecording: stopVideoRecordingForFinalize,
        });

        if (finalizeResult.type === "error") {
          pendingVideoStopRef.current = null;
          isExitingRef.current = false;
          setModal({
            isOpen: true,
            title: "Recording Save Failed",
            description:
              finalizeResult.message ||
              "Failed to finalize and save your interview recording. You can retry or proceed to analytics.",
            confirmLabel: "Proceed to Analytics",
            cancelLabel: "Retry",
            variant: "warning",
            onConfirm: () => {
              closeModal();
              media.stopStream();
              router.push("/analytics");
            },
            onCancel: () => {
              closeModal();
              void handleExitInterviewRef.current({ skipConfirmation: true });
            },
          });
          return;
        }
      } catch (error) {
        console.error("Error finalizing interview upload:", error);
        pendingVideoStopRef.current = null;
        isExitingRef.current = false;
        setModal({
          isOpen: true,
          title: "Recording Save Failed",
          description: "An unexpected error occurred while saving your interview recording. You can retry or proceed to analytics.",
          confirmLabel: "Proceed to Analytics",
          cancelLabel: "Retry",
          variant: "warning",
          onConfirm: () => {
            closeModal();
            media.stopStream();
            router.push("/analytics");
          },
          onCancel: () => {
            closeModal();
            void handleExitInterviewRef.current({ skipConfirmation: true });
          },
        });
        return;
      }

      media.stopStream();
      router.push("/analytics");
    },
    [interviewId, media, router, speech, stopVideoRecordingForFinalize, closeModal]
  );

  useEffect(() => {
    handleExitInterviewRef.current = handleExitInterview;
  }, [handleExitInterview]);

  // As soon as the interview completes: stop TTS, finalize upload in the background, leave the room.
  useEffect(() => {
    if (!interviewDone || autoExitScheduledRef.current) return;
    autoExitScheduledRef.current = true;
    cancelTts();
    void handleExitInterviewRef.current({ skipConfirmation: true });
  }, [interviewDone, cancelTts]);

  const handleCountdownExpired = useCallback(() => {
    setInterviewDone(true);
    void handleExitInterviewRef.current({ skipConfirmation: true });
  }, []);

  const countdown = useInterviewCountdown({
    interviewStarted,
    interviewDone,
    durationMinutes,
    sessionCreatedAt,
    onExpired: handleCountdownExpired,
  });

  useEffect(() => {
    if (!chatScrollContainerRef.current) return;

    chatScrollBehaviorRef.current =
      chat.currentStreamedText ||
      speech.interimTranscript ||
      speech.volatileTranscript
        ? "auto"
        : "smooth";

    if (chatScrollFrameRef.current !== null) return;

    chatScrollFrameRef.current = requestAnimationFrame(() => {
      chatScrollFrameRef.current = null;
      chatBottomRef.current?.scrollIntoView({
        behavior: chatScrollBehaviorRef.current,
        block: "end",
      });
    });
  }, [chat.messages, chat.currentStreamedText, chat.isThinking, speech.interimTranscript, speech.volatileTranscript]);

  useEffect(() => {
    return () => {
      if (chatScrollFrameRef.current !== null) {
        cancelAnimationFrame(chatScrollFrameRef.current);
        chatScrollFrameRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    void loadSessionMeta().catch((error) => {
      if (isMountedRef.current) {
        console.error("Failed to load interview session metadata:", error);
      }
    });
  }, [loadSessionMeta]);

  useEffect(() => {
    onRecordingEndedRef.current = () => {
      setModal({
        isOpen: true,
        title: "Recording Stopped",
        description: "Camera recording was stopped. The interview will now exit and save what was recorded.",
        onConfirm: () => {
          closeModal();
          void handleExitInterviewRef.current({ skipConfirmation: true });
        },
        variant: "danger",
        confirmLabel: "Exit",
      });
    };
  }, [closeModal]);

  const answeredQuestions = Math.min(
    chat.messages.filter((message) => message.role === "user").length,
    totalQuestions
  );
  const questionProgressPercent = Math.min((answeredQuestions / totalQuestions) * 100, 100);

  const timeProgressPercent = countdown.timeProgressPercent ?? questionProgressPercent;

  const { mountVideoNode } = media;
  const handleVideoMount = useCallback(
    (node: HTMLVideoElement | null) => {
      mountVideoNode(node);
    },
    [mountVideoNode]
  );

  return {
    showPreJoin,
    interviewStarted,
    interviewDone,
    isUploading,
    timeRemainingFormatted: countdown.timeRemainingFormatted,
    timeProgressPercent,
    isGraceWarningActive: countdown.isGraceWarningActive,
    totalQuestions,
    interviewType,
    joinBlockedReason,
    resumeExpired,
    answeredQuestions,
    questionProgressPercent,
    chatScrollContainerRef,
    chatBottomRef,
    speech,
    chat,
    tts,
    media,
    requestPermissions,
    videoRecording,
    audioLevels,
    handlePermissionsGranted,
    handleExitInterview,
    handleVideoMount,
    codingChallenge: chat.codingChallenge,
    whiteboardRef,
    modal,
    closeModal,
  };
}
