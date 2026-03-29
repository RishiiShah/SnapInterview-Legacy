import { motion } from "framer-motion";
import PermissionRequest, { type PermissionRequestProps } from "@/components/interview/PermissionRequest";
import { IconChevronLeft } from "@/components/ui/icons";

type PreJoinScreenProps = {
  onBack: () => void;
  onPermissionsGranted: () => void;
} & Omit<
  PermissionRequestProps,
  "isOpen" | "onPermissionsGranted"
>;

export default function PreJoinScreen({
  onBack,
  onPermissionsGranted,
  hasPermission,
  isLoading,
  error,
  requestPermissions,
  videoRef,
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
  joinBlockedReason,
  stream,
}: PreJoinScreenProps) {
  return (
    <motion.div
      key="prejoin"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="min-h-screen w-full bg-white absolute inset-0 z-10"
    >
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="mb-8 flex items-start justify-start">
          <button
            onClick={onBack}
            className="mb-4 flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 hover:border-zinc-300"
          >
            <IconChevronLeft className="h-4 w-4" />
            Back
          </button>
        </div>
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Join interview</h1>
          <p className="mt-1 text-sm text-zinc-500">Allow camera and microphone, then join when you are ready.</p>
        </div>

        <PermissionRequest
          isOpen={true}
          onPermissionsGranted={onPermissionsGranted}
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
      </div>
    </motion.div>
  );
}
