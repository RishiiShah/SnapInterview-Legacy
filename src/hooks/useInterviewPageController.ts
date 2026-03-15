import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useMediaPermissions } from "@/lib/useMediaPermissions";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { useVideoRecording } from "@/hooks/useVideoRecording";
import { useChatSession } from "@/hooks/useChatSession";
import { getInterviewBlockReason } from "@/lib/interview/browser-block";
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
  const [joinBlockedReason, setJoinBlockedReason] = useState<string | null>(null);

  const [modal, setModal] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    onConfirm?: () => void;
    variant?: "danger" | "info" | "warning";
    confirmLabel?: string;
  }>({
    isOpen: false,
    title: "",
    description: "",
  });

  const closeModal = useCallback(() => setModal((prev) => ({ ...prev, isOpen: false })), []);

  const interviewDoneRef = useRef(false);
  const isExitingRef = useRef(false);
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

  useEffect(() => {
    let isCancelled = false;

    const detectUnsupportedBrowser = async () => {
      const reason = await getInterviewBlockReason();
      if (!isCancelled) {
        setJoinBlockedReason(reason);
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

  const handlePermissionsGranted = useCallback(async () => {
    const blockReason = await getInterviewBlockReason();
    if (blockReason) {
      setJoinBlockedReason(blockReason);
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

    setShowPreJoin(false);
    setInterviewStarted(true);
  }, [media.stream, videoRecording]);

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

      speech.stopRecording();
      media.stopStream();
      setIsUploading(true);

      const interviewStatus: InterviewCompletionStatus = interviewDoneRef.current ? "COMPLETED" : "ABORTED";

      try {
        await finalizeInterviewUpload({
          interviewId,
          status: interviewStatus,
          stopVideoRecording: videoRecording.stopVideoRecording,
        });
      } catch (error) {
        console.error("Error finalizing interview upload:", error);
      } finally {
        setIsUploading(false);
        isExitingRef.current = false;
        router.push("/practice");
      }
    },
    [interviewId, media, router, speech, videoRecording.stopVideoRecording]
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
        if (!res.ok) return;

        const data = await res.json();
        if (!isCancelled && typeof data?.questionCount === "number" && data.questionCount > 0) {
          setTotalQuestions(data.questionCount);
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
    media,
    videoRecording,
    handlePermissionsGranted,
    handleExitInterview,
    handleVideoMount,
    modal,
    closeModal,
  };
}