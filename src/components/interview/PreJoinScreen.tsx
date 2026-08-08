"use client";

import Image from "next/image";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import PermissionRequest, { type PermissionRequestProps } from "@/components/interview/PermissionRequest";
import { IconChevronLeft, IconPlay } from "@/components/ui/icons";
import type { BrowserTtsStatus } from "@/lib/tts/browser-tts";
import type { SttWorkerStatus } from "@/lib/stt/stt-messages";

export type PreJoinScreenProps = {
  onBack: () => void;
  onPermissionsGranted: () => void;
  ttsStatus: BrowserTtsStatus;
  sttStatus?: SttWorkerStatus;
} & Omit<
  PermissionRequestProps,
  "isOpen" | "onPermissionsGranted"
>;

export default function PreJoinScreen({
  onBack,
  onPermissionsGranted,
  ttsStatus,
  sttStatus,
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
  const [showCompatibilityPopup, setShowCompatibilityPopup] = useState(false);
  const canJoin = hasPermission === true;

  function handleJoin() {
    if (joinBlockedReason?.severity === "block") {
      setShowCompatibilityPopup(true);
      return;
    }
    onPermissionsGranted();
  }

  return (
    <motion.div
      key="prejoin"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="absolute inset-0 z-10 min-h-screen w-full overflow-y-auto bg-[#090A0F] text-[#F2F4F8] antialiased"
    >
      {/* Same photographic atmosphere as landing + auth */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
        <Image
          src="/hero-starry-bg.jpg"
          alt=""
          fill
          priority
          quality={90}
          sizes="100vw"
          className="object-cover object-center"
        />
        <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-[#090A0F]/85 via-[#090A0F]/35 to-transparent" />
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 70% 65% at 50% 42%, rgba(9,10,15,0.5) 0%, rgba(9,10,15,0.82) 70%, rgba(9,10,15,0.95) 100%)",
          }}
        />
        <div
          className="absolute inset-x-0 bottom-0 h-64"
          style={{
            background:
              "linear-gradient(to top, #090A0F 0%, rgba(9,10,15,0.92) 40%, transparent 100%)",
          }}
        />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-3xl px-5 pb-28 pt-8 sm:px-8 lg:pt-10">
        <button
          type="button"
          onClick={onBack}
          className="mb-10 inline-flex cursor-pointer items-center gap-1.5 text-sm text-[#A8B0C2] transition-colors hover:text-[#E8ECF4]"
        >
          <IconChevronLeft className="h-4 w-4" />
          Back
        </button>

        <div className="mb-10">
          <p className="font-mono text-[11px] tabular-nums text-[#6B7385]">Pre-join</p>
          <h1 className="mt-3 font-display text-[2.15rem] leading-[1.12] tracking-[-0.03em] text-[#F2F4F8] sm:text-[2.65rem]">
            Check your setup
          </h1>
          <p className="mt-3 max-w-md text-[15px] leading-relaxed text-[#B4BBC9]">
            Microphone is required. Camera is optional.
          </p>
        </div>

        {ttsStatus === "loading" ? (
          <div
            className="mb-6 border-b border-[#3B82F6]/30 pb-3 text-sm text-[#93C5FD]"
            role="status"
          >
            Preparing interview voice…
          </div>
        ) : null}
        {ttsStatus === "fallback" || ttsStatus === "error" ? (
          <div
            className="mb-6 border-b border-amber-500/30 pb-3 text-sm text-amber-200/90"
            role="status"
          >
            Using backup interview voice
          </div>
        ) : null}

        {sttStatus === "loading" && (
          <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800" role="status">
            Preparing speech recognition…
          </div>
        )}
        {sttStatus === "error" && (
          <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800" role="status">
            Speech recognition unavailable — you can type your answers instead.
          </div>
        )}

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

      {/* Sticky join */}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-20 px-5 pb-5 pt-16 sm:px-8">
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#090A0F] via-[#090A0F]/90 to-transparent"
          aria-hidden
        />
        <div className="pointer-events-auto relative mx-auto flex w-full max-w-3xl items-center justify-between gap-3">
          <p className="min-w-0 text-[13px] text-[#8B93A7]">
            {canJoin
              ? isCameraEnabled
                ? "Mic and camera ready"
                : "Mic ready · camera optional"
              : "Allow the microphone to continue"}
          </p>
          <button
            type="button"
            onClick={handleJoin}
            disabled={!canJoin}
            className="inline-flex h-11 shrink-0 cursor-pointer items-center gap-2 rounded-lg bg-[#3B82F6] px-5 text-sm font-medium text-white transition-colors hover:bg-[#4B8FF7] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <IconPlay className="h-4 w-4 fill-current" />
            Join now
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showCompatibilityPopup && joinBlockedReason ? (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-[#090A0F]/75 backdrop-blur-sm"
              onClick={() => setShowCompatibilityPopup(false)}
            />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.97, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97, y: 8 }}
                transition={{ duration: 0.22, ease: "easeOut" }}
                className="w-full max-w-md overflow-hidden rounded-2xl border border-white/[0.1] bg-[#12141A] shadow-2xl"
              >
                <div className="p-6">
                  <h3 className="font-display text-xl tracking-[-0.02em] text-[#F2F4F8]">
                    Browser not supported
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#A8B0C2]">
                    {joinBlockedReason.reason}
                  </p>
                  <p className="mt-2 text-sm text-[#C5CBD8]">
                    Please use Chrome, Safari, or Edge for this interview.
                  </p>
                </div>
                <div className="flex items-center justify-end border-t border-white/[0.06] px-6 py-4">
                  <button
                    type="button"
                    onClick={() => setShowCompatibilityPopup(false)}
                    className="cursor-pointer rounded-lg bg-[#3B82F6] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#4B8FF7]"
                  >
                    Got it
                  </button>
                </div>
              </motion.div>
            </div>
          </>
        ) : null}
      </AnimatePresence>
    </motion.div>
  );
}
