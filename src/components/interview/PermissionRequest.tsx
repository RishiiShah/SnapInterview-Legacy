"use client";

import type { RefObject } from "react";
import { useAudioAnalyser } from "@/hooks/useAudioAnalyser";
import type { MediaDeviceInfo } from "@/hooks/useMediaPermissions";
import {
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
  hasPermission,
  isLoading,
  error,
  requestPermissions,
  videoRef,
  audioInputs = [],
  audioOutputs = [],
  videoInputs = [],
  isMicEnabled = true,
  isCameraEnabled = false,
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

  if (!isOpen) return null;

  return (
    <div className="space-y-8">
      {joinBlockedReason?.severity === "warning" ? (
        <div className="border-b border-amber-500/25 pb-4">
          <p className="text-[11px] uppercase tracking-[0.14em] text-amber-200/70">Browser warning</p>
          <p className="mt-1.5 text-sm leading-relaxed text-amber-100/85">
            {joinBlockedReason.reason}
          </p>
        </div>
      ) : null}

      <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-white/[0.1] bg-[#0B0C10]/70 shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur-[2px]">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="h-full w-full object-cover"
          style={{ transform: "scaleX(-1)" }}
        />

        {(!hasPermission || !isCameraEnabled) && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#090A0F]/72">
            <div className="max-w-sm px-6 text-center">
              {!hasPermission ? (
                <>
                  <p className="font-display text-[1.65rem] leading-tight tracking-[-0.02em] text-[#F2F4F8]">
                    Allow your microphone
                  </p>
                  <p className="mt-2 text-[14px] leading-relaxed text-[#A8B0C2]">
                    Needed for the interview. Camera can stay off.
                  </p>
                  <button
                    type="button"
                    onClick={() => requestPermissions()}
                    disabled={isLoading || !!error}
                    className="mt-6 inline-flex h-11 cursor-pointer items-center rounded-lg bg-[#3B82F6] px-5 text-sm font-medium text-white transition-colors hover:bg-[#4B8FF7] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {error ? "Refresh page to retry" : "Allow microphone"}
                  </button>
                  {error ? <p className="mt-3 text-xs leading-relaxed text-rose-300">{error}</p> : null}
                </>
              ) : (
                <>
                  <p className="text-[15px] font-medium text-[#E8ECF4]">Camera is off</p>
                  <p className="mt-1 text-[13px] text-[#8B93A7]">Optional. Turn it on whenever you want.</p>
                </>
              )}
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#090A0F]/80">
            <div className="flex items-center gap-2.5 text-sm text-[#E8ECF4]">
              <IconSpinner className="h-4 w-4 animate-spin text-[#A8B0C2]" />
              Requesting access…
            </div>
          </div>
        ) : null}

        <span className="absolute bottom-3 right-3 z-20 rounded-md bg-black/50 px-2 py-1 text-[11px] font-medium text-white/90">
          You
        </span>

        {hasPermission && isMicEnabled ? (
          <div className="absolute bottom-4 left-4 z-20 flex h-6 items-center gap-1">
            {audioLevels.map((level, index) => {
              const isActive = level > 5;
              const dynamicHeight = isActive ? Math.max(6, Math.min(24, 6 + level * 0.2)) : 6;
              return (
                <div
                  key={index}
                  className="w-1 rounded-full bg-[#3B82F6] transition-all duration-75 ease-out"
                  style={{
                    opacity: isActive ? 0.95 : 0.35,
                    height: `${dynamicHeight}px`,
                  }}
                />
              );
            })}
          </div>
        ) : null}

        {hasPermission ? (
          <div className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2.5">
            <button
              type="button"
              onClick={toggleMic}
              className={`flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl border transition-colors ${
                isMicEnabled
                  ? "border-white/[0.16] bg-black/35 text-[#F2F4F8] hover:bg-black/50"
                  : "border-rose-400/35 bg-rose-500/25 text-rose-50 hover:bg-rose-500/35"
              }`}
              title={isMicEnabled ? "Turn off microphone" : "Turn on microphone"}
            >
              {isMicEnabled ? (
                <IconMicrophoneSolid className="h-5 w-5" />
              ) : (
                <IconMicrophoneOffSolid className="h-5 w-5" />
              )}
            </button>

            <button
              type="button"
              onClick={toggleCamera}
              className={`flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl border transition-colors ${
                isCameraEnabled
                  ? "border-white/[0.16] bg-black/35 text-[#F2F4F8] hover:bg-black/50"
                  : "border-white/[0.12] bg-black/25 text-[#A8B0C2] hover:bg-black/40 hover:text-[#E8ECF4]"
              }`}
              title={isCameraEnabled ? "Turn off camera" : "Turn on camera (optional)"}
            >
              {isCameraEnabled ? (
                <IconVideoCamera className="h-5 w-5" />
              ) : (
                <IconVideoCameraOff className="h-5 w-5" />
              )}
            </button>
          </div>
        ) : null}
      </div>

      {/* Native device selects — OS menus don't extend page layout */}
      {hasPermission ? (
        <div className="grid gap-6 sm:grid-cols-3">
          <DeviceField
            label="Microphone"
            value={selectedAudioInputId || audioInputs[0]?.deviceId || ""}
            onChange={(value) => selectAudioInput?.(value)}
            options={audioInputs}
            emptyLabel="Microphone"
          />
          <DeviceField
            label="Speaker"
            value={selectedAudioOutputId || audioOutputs[0]?.deviceId || ""}
            onChange={(value) => selectAudioOutput?.(value)}
            options={audioOutputs}
            emptyLabel="Speaker"
          />
          <DeviceField
            label="Camera"
            optional
            value={selectedVideoInputId || videoInputs[0]?.deviceId || ""}
            onChange={(value) => selectVideoInput?.(value)}
            options={videoInputs}
            emptyLabel="Camera"
            disabled={!isCameraEnabled}
          />
        </div>
      ) : null}
    </div>
  );
}

function DeviceField({
  label,
  optional,
  value,
  onChange,
  options,
  emptyLabel,
  disabled,
}: {
  label: string;
  optional?: boolean;
  value: string;
  onChange: (value: string) => void;
  options: MediaDeviceInfo[];
  emptyLabel: string;
  disabled?: boolean;
}) {
  return (
    <div>
      <p className="mb-1.5 text-[12px] font-medium text-[#A8B0C2]">
        {label}
        {optional ? <span className="font-normal text-[#6B7385]"> · optional</span> : null}
      </p>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        className="w-full cursor-pointer truncate border-b border-white/[0.12] bg-transparent py-2.5 text-[15px] text-[#F2F4F8] outline-none transition-colors hover:border-white/[0.2] focus:border-[#3B82F6] disabled:cursor-not-allowed disabled:opacity-40"
      >
        {options.length > 0 ? (
          options.map((d) => (
            <option key={d.deviceId} value={d.deviceId} className="bg-[#12141A] text-[#E8ECF4]">
              {d.label}
            </option>
          ))
        ) : (
          <option value="">{emptyLabel}</option>
        )}
      </select>
    </div>
  );
}
