import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useMediaPermissions } from "@/lib/useMediaPermissions";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { useVideoRecording } from "@/hooks/useVideoRecording";
import { useChatSession } from "@/hooks/useChatSession";
import { useStreamingTTS } from "@/hooks/useStreamingTTS";
import { useAudioAnalyser } from "@/hooks/useAudioAnalyser";
import { getInterviewBlockReason, type BrowserBlockResult } from "@/lib/interview/browser-block";
import { finalizeInterviewUpload, type InterviewCompletionStatus } from "@/lib/video/upload-service";

type UseInterviewPageControllerOptions = {
  interviewId: string;
};

export function useInterviewPageController({ interviewId }: UseInterviewPageControllerOptions) {
  const router = useRouter();

  const [showPreJoin, setShowPreJoin] = useState(true);
  const [interviewStarted, setInterviewStarted] = useState(false);
  const [interviewDone, setInterviewDone] = useState(false);
  const [nativeShareStopped, setNativeShareStopped] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [totalQuestions, setTotalQuestions] = useState(10);
  const [persona, setPersona] = useState<string | null>(null);
  const [joinBlockedReason, setJoinBlockedReason] = useState<BrowserBlockResult>(null);

  const [modal, setModal] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    onConfirm?: () => void;
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
  const chatMessagesRef = useRef<typeof chat.messages>([]);

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

  const speech = useSpeechRecognition();

  const media = useMediaPermissions();

  const videoRecording = useVideoRecording({
    onScreenShareEnded: () => {
      setNativeShareStopped(true);
    },
  });

  const chat = useChatSession({
    interviewId,
    interviewStarted,
    interviewDone,
    finalTranscriptBlock: speech.finalTranscriptBlock,
    setInterviewDone,
  });

  const tts = useStreamingTTS({
    streamingText: chat.currentStreamedText,
    completedText: chat.lastCompletedAiText,
    enabled: interviewStarted && !interviewDone,
    persona,
  });

  const audioLevels = useAudioAnalyser(media.stream, media.isMicEnabled);

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
    const blockResult = await getInterviewBlockReason();
    if (blockResult?.severity === "block") {
      setJoinBlockedReason(blockResult);
      return;
    }

    const started = await videoRecording.startScreenRecording(media.stream || undefined);
    if (!started) {
      setModal({
        isOpen: true,
        title: "Screen Recording Required",
        description: "Please allow screen recording to start the interview. This is used to capture your session for analysis.",
        variant: "warning",
      });
      return;
    }

    const pendingRaw = sessionStorage.getItem(`pending_interview_${interviewId}`);
    if (pendingRaw) {
      try {
        const payload = JSON.parse(pendingRaw);
        payload.id = interviewId;
        const res = await fetch("/api/interview/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("Server rejected session creation");
        sessionStorage.removeItem(`pending_interview_${interviewId}`);
      } catch (err) {
        console.error("Failed to persist session to DB", err);
        setModal({
          isOpen: true,
          title: "Connection Error",
          description: "Failed to establish interview session. Please try again.",
          variant: "danger",
        });
        void videoRecording.stopVideoRecording();
        return;
      }
    }

    setShowPreJoin(false);
    setInterviewStarted(true);
  }, [media.stream, videoRecording, interviewId]);

  const handleExitInterview = useCallback(
    async ({ skipConfirmation = false }: { skipConfirmation?: boolean } = {}) => {
      if (!skipConfirmation && !interviewDoneRef.current) {
        setModal({
          isOpen: true,
          title: "Exit Interview",
          description: "Are you sure you want to exit? Your recording will be saved and you can view it later.",
          onConfirm: () => {
            closeModal();
            void handleExitInterview({ skipConfirmation: true });
          },
          variant: "warning",
          confirmLabel: "Exit Interview",
        });
        return;
      }

      if (isExitingRef.current) return;
      isExitingRef.current = true;

      // Clear active ID immediately to prevent accidental deletion on practice page
      localStorage.removeItem("active_interview_id");

      speech.stopRecording();
      media.stopStream();
      setIsUploading(true);

      const userAnswerCount = chatMessagesRef.current.filter((m) => m.role === "user").length;
      const interviewStatus: InterviewCompletionStatus =
        interviewDoneRef.current || userAnswerCount > 0 ? "COMPLETED" : "ABORTED";

      try {
        const result = await finalizeInterviewUpload({
          interviewId,
          status: interviewStatus,
          stopVideoRecording: videoRecording.stopVideoRecording,
        });

        if (result.type === "error") {
          setModal({
            isOpen: true,
            title: "Upload Failed",
            description: `${result.message}. Would you like to try again?`,
            onConfirm: () => {
              closeModal();
              void handleExitInterview({ skipConfirmation: true });
            },
            variant: "danger",
            confirmLabel: "Retry Upload",
          });
          return;
        }

        router.push("/recordings");
      } catch (error) {
        console.error("Error finalizing interview upload:", error);
        setModal({
          isOpen: true,
          title: "Critical Error",
          description: "An unexpected error occurred during upload. Please try again.",
          onConfirm: () => {
            closeModal();
            void handleExitInterview({ skipConfirmation: true });
          },
          variant: "danger",
          confirmLabel: "Retry",
        });
      } finally {
        setIsUploading(false);
        isExitingRef.current = false;
      }
    },
    [interviewId, media, router, speech, videoRecording.stopVideoRecording, closeModal]
  );

  useEffect(() => {
    if (!interviewDone) return;

    const exitTimer = setTimeout(() => {
      if (!isExitingRef.current && !isUploading) {
        void handleExitInterview({ skipConfirmation: true });
      }
    }, 4000);

    return () => clearTimeout(exitTimer);
  }, [handleExitInterview, interviewDone, isUploading]);

  useEffect(() => {
    if (!chatScrollContainerRef.current) return;
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [chat.messages, chat.currentStreamedText, chat.isThinking, speech.interimTranscript, speech.volatileTranscript]);

  useEffect(() => {
    let isCancelled = false;

    const loadSessionMeta = async () => {
      try {
        const res = await fetch(`/api/interview/session?interviewId=${encodeURIComponent(interviewId)}`);
        if (!res.ok) {
          const pendingRaw = sessionStorage.getItem(`pending_interview_${interviewId}`);
          if (pendingRaw && !isCancelled) {
            const data = JSON.parse(pendingRaw);
            if (typeof data?.questionCount === "number" && data.questionCount > 0) {
              setTotalQuestions(data.questionCount);
            }
            if (typeof data?.persona === "string") {
              setPersona(data.persona);
            }
          }
          return;
        }

        const data = await res.json();
        if (!isCancelled && typeof data?.questionCount === "number" && data.questionCount > 0) {
          setTotalQuestions(data.questionCount);
        }
        if (!isCancelled && typeof data?.persona === "string") {
          setPersona(data.persona);
        }
      } catch (error) {
        console.error("Failed to load interview session metadata:", error);
      }
    };

    void loadSessionMeta();

    return () => {
      isCancelled = true;
    };
  }, [interviewId]);

  useEffect(() => {
    if (!nativeShareStopped) return;

    setModal({
      isOpen: true,
      title: "Recording Stopped",
      description: "Screen sharing was stopped manually. The interview will now exit and save what was recorded.",
      onConfirm: () => {
        closeModal();
        void handleExitInterview({ skipConfirmation: true });
      },
      variant: "danger",
      confirmLabel: "Exit",
    });
    setNativeShareStopped(false);
  }, [handleExitInterview, nativeShareStopped, closeModal]);

  const answeredQuestions = Math.min(
    chat.messages.filter((message) => message.role === "user").length,
    totalQuestions
  );
  const questionProgressPercent = Math.min((answeredQuestions / totalQuestions) * 100, 100);

  const handleVideoMount = useCallback(
    (node: HTMLVideoElement | null) => {
      media.videoRef.current = node;
      if (node && media.stream && node.srcObject !== media.stream) {
        node.srcObject = media.stream;
      }
    },
    [media.stream, media.videoRef]
  );

  return {
    router,
    showPreJoin,
    interviewStarted,
    interviewDone,
    isUploading,
    totalQuestions,
    joinBlockedReason,
    answeredQuestions,
    questionProgressPercent,
    chatScrollContainerRef,
    chatBottomRef,
    setInterviewDone,
    speech,
    chat,
    tts,
    media,
    videoRecording,
    audioLevels,
    handlePermissionsGranted,
    handleExitInterview,
    handleVideoMount,
    modal,
    closeModal,
  };
}
