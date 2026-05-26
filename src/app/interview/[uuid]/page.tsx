"use client";

import { useParams, useRouter } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import PreJoinScreen from "@/components/interview/PreJoinScreen";
import ActiveInterviewScreen from "@/components/interview/ActiveInterviewScreen";
import { useInterviewPageController } from "@/hooks/useInterviewPageController";
import Modal from "@/components/ui/Modal";

export default function InterviewPage() {
  const params = useParams();
  const router = useRouter();
  const interviewId = params.uuid as string;
  const {
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
          onPermissionsGranted={handlePermissionsGranted}
          hasPermission={media.hasPermission}
          isLoading={media.isLoading}
          error={media.error}
          requestPermissions={media.requestPermissions}
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
          stream={media.stream}
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
          isModelLoading={speech.isModelLoading}
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
        />
      )}
    </AnimatePresence>

    <Modal
      isOpen={modal.isOpen}
      onClose={closeModal}
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
