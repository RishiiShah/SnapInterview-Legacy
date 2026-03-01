"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import PreJoinScreen from "@/components/interview/PreJoinScreen";
import ActiveInterviewScreen from "@/components/interview/ActiveInterviewScreen";
import { useMediaPermissions } from "@/lib/useMediaPermissions";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { useVideoRecording } from "@/hooks/useVideoRecording";
import { useChatSession } from "@/hooks/useChatSession";
import { finalizeInterviewUpload, type InterviewCompletionStatus } from "@/lib/video/upload-service";

type BraveNavigator = Navigator & {
  brave?: {
    isBrave?: () => Promise<boolean>;
  };
};

async function getInterviewBlockReason(): Promise<string | null> {
  if (typeof navigator === "undefined") return null;

  const userAgent = navigator.userAgent.toLowerCase();
  if (userAgent.includes("firefox")) {
    return "Firefox is currently not supported for starting interviews.";
  }

  const braveNavigator = navigator as BraveNavigator;
  try {
    if (typeof braveNavigator.brave?.isBrave === "function") {
      const isBrave = await braveNavigator.brave.isBrave();
      if (isBrave) {
        return "Brave is currently not supported for starting interviews.";
      }
    }
  } catch {
    // Ignore Brave detection errors and continue.
  }

  if (userAgent.includes("brave")) {
    return "Brave is currently not supported for starting interviews.";
  }

  return null;
}

export default function InterviewPage() {
  const params = useParams();
  const router = useRouter();
  const interviewId = params.uuid as string;

  const [showPreJoin, setShowPreJoin] = useState(true);
  const [interviewStarted, setInterviewStarted] = useState(false);
  const [interviewDone, setInterviewDone] = useState(false);
  const [nativeShareStopped, setNativeShareStopped] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [totalQuestions, setTotalQuestions] = useState(10);
  const [joinBlockedReason, setJoinBlockedReason] = useState<string | null>(null);

  const interviewDoneRef = useRef(false);
  const isExitingRef = useRef(false);
  const chatScrollContainerRef = useRef<HTMLDivElement | null>(null);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  const {
    isRecording,
    toggleRecording,
    stopRecording,
    interimTranscript,
    volatileTranscript,
    finalTranscriptBlock,
    speechError,
    hasSupport: hasSpeechSupport,
  } = useSpeechRecognition();

  const {
    messages,
    currentStreamedText,
    isThinking,
  } = useChatSession({
    interviewId,
    interviewStarted,
    interviewDone,
    finalTranscriptBlock,
    setInterviewDone,
  });

  const {
    videoRef,
    stream,
    stopStream,
    hasPermission,
    isLoading,
    error,
    requestPermissions,
    audioInputs,
    audioOutputs,
    videoInputs,
    isMicEnabled,
    isCameraEnabled,
    selectedAudioInputId,
    selectedAudioOutputId,
    selectedVideoInputId,
    selectAudioInput,
    selectAudioOutput,
    selectVideoInput,
    toggleMic,
    toggleCamera,
  } = useMediaPermissions();

  const { isRecordingVideo, startScreenRecording, stopVideoRecording } = useVideoRecording({
    onScreenShareEnded: () => {
      setNativeShareStopped(true);
    },
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

  const handlePermissionsGranted = async () => {
    const blockReason = await getInterviewBlockReason();
    if (blockReason) {
      setJoinBlockedReason(blockReason);
      return;
    }

    const started = await startScreenRecording(stream || undefined);
    if (!started) {
      alert("Please allow screen recording to start the interview.");
      return;
    }

    setShowPreJoin(false);
    setInterviewStarted(true);
  };

  const handleExitInterview = useCallback(async ({ skipConfirmation = false }: { skipConfirmation?: boolean } = {}) => {
    if (!skipConfirmation && !interviewDoneRef.current) {
      const confirmed = window.confirm("Are you sure you want to exit? Your recording will be saved.");
      if (!confirmed) return;
    }

    if (isExitingRef.current) return;
    isExitingRef.current = true;

    stopRecording();
    stopStream();
    setIsUploading(true);

    const interviewStatus: InterviewCompletionStatus = interviewDoneRef.current ? "COMPLETED" : "ABORTED";

    try {
      await finalizeInterviewUpload({
        interviewId,
        status: interviewStatus,
        stopVideoRecording,
      });
    } catch (error) {
      console.error("Error finalizing interview upload:", error);
    } finally {
      setIsUploading(false);
      isExitingRef.current = false;
      router.push("/practice");
    }
  }, [interviewId, router, stopRecording, stopStream, stopVideoRecording]);

  useEffect(() => {
    if (!interviewDone) return;

    const exitTimer = setTimeout(() => {
      if (!isExitingRef.current && !isUploading) {
        void handleExitInterview({ skipConfirmation: true });
      }
    }, 4000);

    return () => clearTimeout(exitTimer);
  }, [interviewDone, isUploading, handleExitInterview]);

  useEffect(() => {
    if (!chatScrollContainerRef.current) return;
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, currentStreamedText, isThinking, interimTranscript, volatileTranscript]);

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

    alert("Screen sharing was stopped. The interview will now exit and save what was recorded.");
    void handleExitInterview({ skipConfirmation: true });
    setNativeShareStopped(false);
  }, [nativeShareStopped, handleExitInterview]);

  const answeredQuestions = Math.min(
    messages.filter((message) => message.role === "user").length,
    totalQuestions
  );
  const questionProgressPercent = Math.min((answeredQuestions / totalQuestions) * 100, 100);

  return (
    <AnimatePresence mode="wait">
      {showPreJoin && (
        <PreJoinScreen
          onBack={() => {
            stopRecording();
            stopStream();
            router.push("/practice");
          }}
          onPermissionsGranted={handlePermissionsGranted}
          hasPermission={hasPermission}
          isLoading={isLoading}
          error={error}
          requestPermissions={requestPermissions}
          videoRef={videoRef}
          audioInputs={audioInputs}
          audioOutputs={audioOutputs}
          videoInputs={videoInputs}
          isMicEnabled={isMicEnabled}
          isCameraEnabled={isCameraEnabled}
          selectedAudioInputId={selectedAudioInputId}
          selectedAudioOutputId={selectedAudioOutputId}
          selectedVideoInputId={selectedVideoInputId}
          selectAudioInput={selectAudioInput}
          selectAudioOutput={selectAudioOutput}
          selectVideoInput={selectVideoInput}
          toggleMic={toggleMic}
          toggleCamera={toggleCamera}
          joinBlockedReason={joinBlockedReason}
          stream={stream}
        />
      )}

      {interviewStarted && (
        <ActiveInterviewScreen
          answeredQuestions={answeredQuestions}
          totalQuestions={totalQuestions}
          questionProgressPercent={questionProgressPercent}
          isUploading={isUploading}
          interviewDone={interviewDone}
          onExitInterview={() => {
            void handleExitInterview();
          }}
          onVideoMount={(node) => {
            (videoRef as React.MutableRefObject<HTMLVideoElement | null>).current = node;
            if (node && stream && node.srcObject !== stream) {
              node.srcObject = stream;
            }
          }}
          isRecordingVideo={isRecordingVideo}
          chatScrollContainerRef={chatScrollContainerRef}
          chatBottomRef={chatBottomRef}
          messages={messages}
          currentStreamedText={currentStreamedText}
          isThinking={isThinking}
          interimTranscript={interimTranscript}
          volatileTranscript={volatileTranscript}
          hasPermission={hasPermission}
          isMicEnabled={isMicEnabled}
          isCameraEnabled={isCameraEnabled}
          isRecording={isRecording}
          hasSpeechSupport={hasSpeechSupport}
          speechError={speechError}
          toggleMic={toggleMic}
          toggleCamera={toggleCamera}
          toggleRecording={toggleRecording}
        />
      )}
    </AnimatePresence>
  );
}
