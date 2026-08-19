"use client";

import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { AnimatePresence } from "framer-motion";
import PreJoinScreen from "@/components/interview/PreJoinScreen";
import { useInterviewPageController } from "@/hooks/useInterviewPageController";
import Modal from "@/components/ui/Modal";

const ActiveInterviewScreen = dynamic(
  () => import("@/components/interview/ActiveInterviewScreen"),
  {
    ssr: false,
    loading: () => <div className="min-h-screen bg-[#090d14]" aria-label="Loading interview" />,
  },
);

export default function InterviewPageClient() {
  const params = useParams();
  const router = useRouter();
  const interviewId = params.uuid as string;
  const {
    showPreJoin,
    interviewStarted,
    interviewDone,
    isUploading,
    timeRemainingFormatted,
    timeProgressPercent,
    isGraceWarningActive,
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
    codingChallenge,
    whiteboardRef,
    modal,
    closeModal,
  } = useInterviewPageController({ interviewId });

  return (
    <>
    <AnimatePresence mode="wait">
      {showPreJoin && (
        <PreJoinScreen
          onBack={() => {
            speech.stopRecording();
            media.stopStream();
            router.push("/practice");
          }}
          ttsStatus={tts.status}
          sttStatus={speech.sttStatus}
          onPermissionsGranted={handlePermissionsGranted}
          hasPermission={media.hasPermission}
          isLoading={media.isLoading}
          error={media.error}
          requestPermissions={requestPermissions}
          videoRef={media.videoRef}
          audioInputs={media.audioInputs}
          audioOutputs={media.audioOutputs}
          videoInputs={media.videoInputs}
          isMicEnabled={media.isMicEnabled}
          isCameraEnabled={media.isCameraEnabled}
          selectedAudioInputId={media.selectedAudioInputId}
          selectedAudioOutputId={media.selectedAudioOutputId}
          selectedVideoInputId={media.selectedVideoInputId}
          selectAudioInput={media.selectAudioInput}
          selectAudioOutput={media.selectAudioOutput}
          selectVideoInput={media.selectVideoInput}
          toggleMic={media.toggleMic}
          toggleCamera={media.toggleCamera}
          joinBlockedReason={joinBlockedReason}
          resumeExpired={resumeExpired}
          stream={media.stream}
        />
      )}

      {interviewStarted && (
        <ActiveInterviewScreen
          answeredQuestions={answeredQuestions}
          totalQuestions={totalQuestions}
          questionProgressPercent={questionProgressPercent}
          timeRemainingFormatted={timeRemainingFormatted}
          timeProgressPercent={timeProgressPercent}
          isGraceWarningActive={isGraceWarningActive}
          isUploading={isUploading}
          interviewDone={interviewDone}
          onExitInterview={() => {
            void handleExitInterview();
          }}
          onVideoMount={handleVideoMount}
          isRecordingVideo={videoRecording.isRecordingVideo}
          chatScrollContainerRef={chatScrollContainerRef}
          chatBottomRef={chatBottomRef}
          messages={chat.messages}
          currentStreamedText={chat.currentStreamedText}
          isThinking={chat.isThinking}
          interimTranscript={speech.interimTranscript}
          volatileTranscript={speech.volatileTranscript}
          hasPermission={media.hasPermission}
          isMicEnabled={media.isMicEnabled}
          isCameraEnabled={media.isCameraEnabled}
          isRecording={speech.isRecording}
          hasSpeechSupport={speech.hasSupport}
          speechError={speech.speechError}
          audioLevels={audioLevels}
          toggleMic={media.toggleMic}
          toggleCamera={media.toggleCamera}
          toggleRecording={() => {
            if (!speech.isRecording) tts.cancel();
            speech.toggleRecording();
          }}
          onSendTextAnswer={(text) => {
            tts.cancel();
            void chat.sendMessage(text);
          }}
          codingChallenge={codingChallenge}
          codingInterview={interviewType === "coding-algorithms"}
          interviewType={interviewType ?? undefined}
          whiteboardRef={whiteboardRef}
          onShareWhiteboard={(exported) => {
            tts.cancel();
            void chat.shareBoard(exported);
          }}
          onSubmitCode={(message) => {
            tts.cancel();
            void chat.sendMessage(message);
          }}
        />
      )}
    </AnimatePresence>

    <Modal
      isOpen={modal.isOpen}
      onClose={() => {
        const onCancel = modal.onCancel;
        closeModal();
        onCancel?.();
      }}
      onConfirm={modal.onConfirm}
      title={modal.title}
      description={modal.description}
      variant={modal.variant}
      confirmLabel={modal.confirmLabel}
      cancelLabel={modal.cancelLabel}
    />
    </>
  );
}
