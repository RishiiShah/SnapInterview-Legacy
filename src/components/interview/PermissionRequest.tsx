"use client";

import type { RefObject } from "react";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useAudioAnalyser } from "@/hooks/useAudioAnalyser";
import type { MediaDeviceInfo } from "@/lib/useMediaPermissions";
import {
  IconCheckCircle,
  IconMicrophoneOffSolid,
  IconMicrophoneSolid,
  IconSpinner,
  IconVideoCamera,
  IconVideoCameraOff,
} from "@/components/ui/icons";

export interface PermissionRequestProps {
  isOpen: boolean;
  onPermissionsGranted: () => void;
  hasPermission: boolean | null;
  isLoading: boolean;
  error: string | null;
  requestPermissions: () => Promise<void>;
  videoRef: RefObject<HTMLVideoElement | null>;
  audioInputs?: MediaDeviceInfo[];
  audioOutputs?: MediaDeviceInfo[];
  videoInputs?: MediaDeviceInfo[];
  isMicEnabled?: boolean;
  isCameraEnabled?: boolean;
  selectedAudioInputId?: string;
  selectedAudioOutputId?: string;
  selectedVideoInputId?: string;
  selectAudioInput?: (deviceId: string) => void;
  selectAudioOutput?: (deviceId: string) => void;
  selectVideoInput?: (deviceId: string) => void;
  toggleMic?: () => void;
  toggleCamera?: () => void;
  joinBlockedReason?: import("@/lib/interview/browser-block").BrowserBlockResult;
  stream?: MediaStream | null;
}

export default function PermissionRequest({
  isOpen,
  onPermissionsGranted,
  hasPermission,
  isLoading,
  error,
  requestPermissions,
  videoRef,
  audioInputs = [],
  audioOutputs = [],
  videoInputs = [],
  isMicEnabled = true,
  isCameraEnabled = true,
  selectedAudioInputId = "",
  selectedAudioOutputId = "",
  selectedVideoInputId = "",
  selectAudioInput,
  selectAudioOutput,
  selectVideoInput,
  toggleMic,
  toggleCamera,
  joinBlockedReason = null,
  stream,
}: PermissionRequestProps) {
  const audioLevels = useAudioAnalyser(stream || null, isMicEnabled);
  const [showCompatibilityPopup, setShowCompatibilityPopup] = useState(false);

  const handleJoinNow = () => {
    if (joinBlockedReason?.severity === "block") {
      setShowCompatibilityPopup(true);
      return;
    }

    onPermissionsGranted();
  };

  if (!isOpen) return null;

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      {/* Left: preview rectangle + options below */}
      <div className="flex flex-1 flex-col gap-4">
        {joinBlockedReason?.severity === "warning" && (
          <div className="mb-2 rounded-xl border border-amber-200 bg-amber-50/50 p-4">
            <div className="flex gap-3">
              <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-100 mt-0.5">
                <svg className="h-3.5 w-3.5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <p className="text-xs font-semibold text-amber-900 uppercase tracking-wider">Browser Warning</p>
                <p className="mt-1 text-sm text-amber-800 leading-relaxed">
                  {joinBlockedReason.reason}
                </p>
              </div>
            </div>
          </div>
        )}
        {/* Preview: single rounded rectangle with overlaid controls */}
        <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-900">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="h-full w-full object-cover"
            style={{ transform: "scaleX(-1)" }}
          />
          {(!hasPermission || !isCameraEnabled) && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-zinc-800">
              <div className="text-center px-4">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-zinc-700">
                  <IconVideoCamera className="h-7 w-7 text-zinc-400" strokeWidth={1.5} />
                </div>
                {!hasPermission ? (
                  <>
                    <p className="text-lg font-semibold text-white">Camera & Microphone Access</p>
                    <p className="mt-1.5 text-sm text-zinc-400">SnapInterview needs access to see and hear you.</p>
                    <button
                      type="button"
                      onClick={() => requestPermissions()}
                      disabled={isLoading}
                      className="mt-5 rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-zinc-900 transition-colors hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Allow access
                    </button>
                    {error && <p className="mt-3 text-xs text-red-500">{error}</p>}
                  </>
                ) : (
                  <>
                    <p className="text-sm font-medium text-zinc-400">Camera is off</p>
                    <p className="mt-0.5 text-xs text-zinc-500">Click the camera button to turn it on</p>
                  </>
                )}
              </div>
            </div>
          )}
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-zinc-800/90">
              <div className="flex items-center gap-2 rounded-lg bg-zinc-700 px-4 py-2">
                <IconSpinner className="h-4 w-4 animate-spin text-white" />
                <span className="text-sm text-white">Requesting access…</span>
              </div>
            </div>
          )}
          <span className="absolute bottom-2 right-2 z-20 rounded bg-black/50 px-2 py-1 text-xs font-medium text-white/90">
            You
          </span>

          {/* Audio level indicator - bottom left corner */}
          {hasPermission && isMicEnabled && (
            <div className="absolute bottom-4 left-4 z-20 flex h-6 items-center gap-1">
              {audioLevels.map((level, index) => {
                const isActive = level > 5;
                const dynamicHeight = isActive ? Math.max(6, Math.min(24, 6 + (level * 0.2))) : 6;
                return (
                  <div
                    key={index}
                    className="w-1 rounded-full bg-green-500 transition-all duration-75 ease-out"
                    style={{
                      opacity: isActive ? 0.9 : 0.4,
                      height: `${dynamicHeight}px`,
                    }}
                  />
                );
              })}
            </div>
          )}

          {/* Control buttons overlay - bottom center */}
          {hasPermission && (
            <div className="absolute bottom-4 left-1/2 z-20 -translate-x-1/2 flex items-center gap-3">
              {/* Microphone toggle */}
              <button
                onClick={toggleMic}
                className={`flex h-10 w-10 items-center justify-center rounded-lg border-2 border-white transition-all ${isMicEnabled
                  ? "bg-green-500/30 text-white hover:bg-green-500/50"
                  : "bg-red-500/30 text-white hover:bg-red-500/50"
                  }`}
                title={isMicEnabled ? "Turn off microphone" : "Turn on microphone"}
              >
                {isMicEnabled ? (
                  <IconMicrophoneSolid className="h-5 w-5" />
                ) : (
                  <IconMicrophoneOffSolid className="h-5 w-5" />
                )}
              </button>

              {/* Camera toggle */}
              <button
                onClick={toggleCamera}
                className={`flex h-10 w-10 items-center justify-center rounded-lg border-2 border-white transition-all ${isCameraEnabled
                  ? "bg-green-500/30 text-white hover:bg-green-500/50"
                  : "bg-red-500/30 text-white hover:bg-red-500/50"
                  }`}
                title={isCameraEnabled ? "Turn off camera" : "Turn on camera"}
              >
                {isCameraEnabled ? (
                  <IconVideoCamera className="h-5 w-5" />
                ) : (
                  <IconVideoCameraOff className="h-5 w-5" />
                )}
              </button>
            </div>
          )}
        </div>

        {/* Device selection below preview */}
        {hasPermission && (
          <div className="flex justify-center gap-2">
            {/* Microphone dropdown */}
            <select
              value={selectedAudioInputId || audioInputs[0]?.deviceId || ""}
              onChange={(event) => selectAudioInput?.(event.target.value)}
              className="w-32 truncate rounded-lg border border-zinc-200 bg-zinc-50 px-2 py-2 text-sm text-zinc-700 focus:border-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-100 transition-all hover:border-zinc-300 hover:bg-zinc-100"
            >
              {audioInputs.length > 0 ? (
                audioInputs.map((d) => (
                  <option key={d.deviceId} value={d.deviceId}>
                    {d.label}
                  </option>
                ))
              ) : (
                <option value="">Microphone</option>
              )}
            </select>

            {/* Speaker dropdown */}
            <select
              value={selectedAudioOutputId || audioOutputs[0]?.deviceId || ""}
              onChange={(event) => selectAudioOutput?.(event.target.value)}
              className="w-32 truncate rounded-lg border border-zinc-200 bg-zinc-50 px-2 py-2 text-sm text-zinc-700 focus:border-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-100 transition-all hover:border-zinc-300 hover:bg-zinc-100"
            >
              {audioOutputs.length > 0 ? (
                audioOutputs.map((d) => (
                  <option key={d.deviceId} value={d.deviceId}>
                    {d.label}
                  </option>
                ))
              ) : (
                <option value="">Speaker</option>
              )}
            </select>

            {/* Camera dropdown */}
            <select
              value={selectedVideoInputId || videoInputs[0]?.deviceId || ""}
              onChange={(event) => selectVideoInput?.(event.target.value)}
              className="w-32 truncate rounded-lg border border-zinc-200 bg-zinc-50 px-2 py-2 text-sm text-zinc-700 focus:border-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-100 transition-all hover:border-zinc-300 hover:bg-zinc-100"
            >
              {videoInputs.length > 0 ? (
                videoInputs.map((d) => (
                  <option key={d.deviceId} value={d.deviceId}>
                    {d.label}
                  </option>
                ))
              ) : (
                <option value="">Camera</option>
              )}
            </select>
          </div>
        )}


      </div>

      {/* Right: Ready to join + Join now below */}
      <div className="w-full rounded-2xl bg-white p-6 lg:w-80 lg:shrink-0 lg:translate-x-10">
        <h2 className="text-center text-lg font-semibold text-zinc-900">Ready to join?</h2>
        <button
          type="button"
          onClick={handleJoinNow}
          disabled={hasPermission !== true}
          className="mt-6 w-full rounded-lg bg-zinc-900 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Join now
        </button>
      </div>

      <AnimatePresence>
        {showCompatibilityPopup && joinBlockedReason && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-zinc-900/40 backdrop-blur-sm"
              onClick={() => setShowCompatibilityPopup(false)}
            />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                transition={{ type: "spring", duration: 0.3 }}
                className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl shadow-zinc-900/10 ring-1 ring-zinc-200"
              >
                <div className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100">
                      <svg className="h-5 w-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-base font-semibold text-zinc-900">Browser not supported</h3>
                      <p className="mt-2 text-sm text-zinc-600">{joinBlockedReason.reason}</p>
                      <p className="mt-2 text-sm text-zinc-600 font-medium">
                        Please use Chrome, Safari, or Edge for this interview.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-end bg-zinc-50 px-6 py-4">
                  <button
                    onClick={() => setShowCompatibilityPopup(false)}
                    className="cursor-pointer rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-zinc-700"
                  >
                    Got it
                  </button>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
