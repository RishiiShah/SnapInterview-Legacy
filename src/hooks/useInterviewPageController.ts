import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useMediaPermissions } from "@/lib/useMediaPermissions";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { useVideoRecording } from "@/hooks/useVideoRecording";
import { useChatSession } from "@/hooks/useChatSession";
import { useStreamingTTS } from "@/hooks/useStreamingTTS";
import { useAudioAnalyser } from "@/hooks/useAudioAnalyser";
import { getInterviewBlockReason, type BrowserBlockResult } from "@/lib/interview/browser-block";
import { scheduleInterviewFinalize } from "@/lib/video/background-finalize";
import { addPendingInterviewFinalize } from "@/lib/interview/finalize-pending-client";
import type { InterviewCompletionStatus } from "@/lib/video/upload-service";
import { coerceInterviewType, type InterviewType } from "@/lib/interview/domain";

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
  const [interviewType, setInterviewType] = useState<InterviewType | null>(null);
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

  const media = useMediaPermissions();

  const speech = useSpeechRecognition({ audioDeviceId: media.selectedAudioInputId });

  const videoRecording = useVideoRecording({
    interviewId,
    onScreenShareEnded: () => {
      onScreenShareEndedRef.current();
    },
  });
  const { startScreenRecording, stopVideoRecording } = videoRecording;

  const autoExitScheduledRef = useRef(false);
  const pendingVideoStopRef = useRef<ReturnType<typeof stopVideoRecording> | null>(null);

  const stopVideoRecordingForFinalize = useCallback(() => {
    if (!pendingVideoStopRef.current) {
      pendingVideoStopRef.current = stopVideoRecording();
    }
    return pendingVideoStopRef.current;
  }, [stopVideoRecording]);

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
  const { cancel: cancelTts, warmup: warmupTts } = tts;

  const requestPermissions = useCallback(() => {
    warmupTts();
    return media.requestPermissions();
  }, [media, warmupTts]);

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
      setInterviewType(coerceInterviewType(payload.type));
      sessionPromise = fetch("/api/interview/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).then(res => {
        if (!res.ok) throw new Error("Server rejected session creation");
        sessionStorage.removeItem(`pending_interview_${interviewId}`);
      });
    }

    const started = await startScreenRecording(media.stream || undefined, sessionPromise);
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
      void stopVideoRecording();
      return;
    }

    setShowPreJoin(false);
    setInterviewStarted(true);
  }, [media.stream, startScreenRecording, stopVideoRecording, interviewId]);

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
      setIsUploading(true);

      const userAnswerCount = chatMessagesRef.current.filter((m) => m.role === "user").length;
      const interviewStatus: InterviewCompletionStatus =
        interviewDoneRef.current || userAnswerCount > 0 ? "COMPLETED" : "ABORTED";

      addPendingInterviewFinalize(interviewId);
      void scheduleInterviewFinalize({
        interviewId,
        status: interviewStatus,
        stopVideoRecording: stopVideoRecordingForFinalize,
      }).catch((error) => {
        console.error("Error finalizing interview upload:", error);
      });

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

  useEffect(() => {
    if (!chatScrollContainerRef.current) return;
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [chat.messages, chat.currentStreamedText, chat.isThinking, speech.interimTranscript, speech.volatileTranscript]);

  useEffect(() => {
    let isCancelled = false;

    const loadSessionMeta = async () => {
      const pendingRaw = sessionStorage.getItem(`pending_interview_${interviewId}`);
      if (pendingRaw) {
        try {
          const data = JSON.parse(pendingRaw);
          if (!isCancelled && typeof data?.questionCount === "number" && data.questionCount > 0) {
            setTotalQuestions(data.questionCount);
          }
          if (!isCancelled && typeof data?.persona === "string") {
            setPersona(data.persona);
          }
          if (!isCancelled) {
            setInterviewType(coerceInterviewType(data?.type));
          }
          return;
        } catch {
          sessionStorage.removeItem(`pending_interview_${interviewId}`);
        }
      }

      try {
        const res = await fetch(`/api/interview/session?interviewId=${encodeURIComponent(interviewId)}`);
        if (!res.ok) {
          return;
        }

        const data = await res.json();
        if (!isCancelled && typeof data?.questionCount === "number" && data.questionCount > 0) {
          setTotalQuestions(data.questionCount);
        }
        if (!isCancelled && typeof data?.persona === "string") {
          setPersona(data.persona);
        }
        if (!isCancelled) {
          setInterviewType(coerceInterviewType(data?.type));
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
    interviewType,
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
    requestPermissions,
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
