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
  const handleExitInterviewRef = useRef<(opts?: { skipConfirmation?: boolean }) => Promise<void>>(async () => {});
  const onScreenShareEndedRef = useRef<() => void>(() => {});

  useEffect(() => {
    if (typeof window === "undefined" || hasCheckedResumeRef.current) return;
    hasCheckedResumeRef.current = true;

    const activeId = localStorage.getItem("active_interview_id");
    if (activeId && activeId !== interviewId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
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
    interviewId,
    onScreenShareEnded: () => {
      onScreenShareEndedRef.current();
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
    // Note: joinBlockedReason check is handled synchronously by the UI before calling this.
    // We must call startScreenRecording synchronously here to preserve the user gesture 
    // context required by Safari for getDisplayMedia.

    const pendingRaw = sessionStorage.getItem(`pending_interview_${interviewId}`);
    let sessionPromise = Promise.resolve();
    
    if (pendingRaw) {
      const payload = JSON.parse(pendingRaw);
      payload.id = interviewId;
      sessionPromise = fetch("/api/interview/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).then(res => {
        if (!res.ok) throw new Error("Server rejected session creation");
        sessionStorage.removeItem(`pending_interview_${interviewId}`);
      });
    }

    const started = await videoRecording.startScreenRecording(media.stream || undefined, sessionPromise);
    if (!started) {
      setModal({
        isOpen: true,
        title: "Screen Recording Required",
        description: "Please allow screen recording to start the interview. This is used to capture your session for analysis.",
        variant: "warning",
      });
      return;
    }

    try {
      await sessionPromise;
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
            void handleExitInterviewRef.current({ skipConfirmation: true });
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

      // Finalize the upload in the background so the user isn't blocked.
      // stopVideoRecording sets isCompleting synchronously, so unmounting the
      // interview page on navigation won't abort the in-flight upload.
      void finalizeInterviewUpload({
        interviewId,
        status: interviewStatus,
        stopVideoRecording: videoRecording.stopVideoRecording,
      }).catch((error) => {
        console.error("Error finalizing interview upload:", error);
      });

      if (interviewStatus === "ABORTED") {
        router.push("/practice");
      } else {
        router.push(`/recordings?processing=${interviewId}`);
      }
    },
    [interviewId, media, router, speech, videoRecording.stopVideoRecording, closeModal]
  );

  useEffect(() => {
    handleExitInterviewRef.current = handleExitInterview;
  }, [handleExitInterview]);

  // Stop mic listening as soon as the interview ends. Guarded so it runs once
  // even though `speech` changes identity every render.
  const hasStoppedSpeechRef = useRef(false);
  useEffect(() => {
    if (interviewDone && !hasStoppedSpeechRef.current) {
      hasStoppedSpeechRef.current = true;
      speech.stopRecording();
    }
  }, [interviewDone, speech]);

  useEffect(() => {
    if (!interviewDone) return;

    // Call through the ref so the timer isn't reset on every render (handleExit
    // is recreated each render, which otherwise blocks the exit while the mic's
    // audio meter keeps re-rendering the page).
    const exitTimer = setTimeout(() => {
      if (!isExitingRef.current && !isUploading) {
        void handleExitInterviewRef.current({ skipConfirmation: true });
      }
    }, 4000);

    return () => clearTimeout(exitTimer);
  }, [interviewDone, isUploading]);

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
    onScreenShareEndedRef.current = () => {
      setModal({
        isOpen: true,
        title: "Recording Stopped",
        description: "Screen sharing was stopped manually. The interview will now exit and save what was recorded.",
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

  const { mountVideoNode } = media;
  const handleVideoMount = useCallback(
    (node: HTMLVideoElement | null) => {
      mountVideoNode(node);
    },
    [mountVideoNode]
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
    codingChallenge: chat.codingChallenge,
    modal,
    closeModal,
  };
}
