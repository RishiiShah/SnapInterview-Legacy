"use client";

import type { RefObject } from "react";
import { useState, useEffect } from "react";
import type { MediaDeviceInfo } from "@/lib/useMediaPermissions";

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
  toggleMic?: () => void;
  toggleCamera?: () => void;
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
  toggleMic,
  toggleCamera,
  stream,
}: PermissionRequestProps) {
  const [audioLevel, setAudioLevel] = useState(0);

  // Set up audio analyser for level visualization
  useEffect(() => {
    if (!stream || !isMicEnabled) {
      setAudioLevel(0);
      return;
    }

    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);
      analyser.fftSize = 256;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      let animationId: number;

      const updateLevel = () => {
        analyser.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
        setAudioLevel(Math.min(100, (average / 255) * 150)); // Scale to 0-100
        animationId = requestAnimationFrame(updateLevel);
      };

      updateLevel();

      return () => {
        cancelAnimationFrame(animationId);
        source.disconnect();
        analyser.disconnect();
      };
    } catch (err) {
      console.error("Failed to set up audio analyser:", err);
    }
  }, [stream, isMicEnabled]);

  if (!isOpen) return null;

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-center">
      {/* Left: preview rectangle + options below */}
      <div className="flex flex-1 flex-col gap-4">
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
            <div className="absolute inset-0 flex items-center justify-center bg-zinc-800">
              <div className="text-center">
                <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-zinc-600">
                  <svg className="h-7 w-7 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-zinc-400">
                  {!hasPermission ? "Camera preview" : "Camera is off"}
                </p>
                <p className="mt-0.5 text-xs text-zinc-500">
                  {!hasPermission ? "Allow access to see yourself" : "Click the camera button to turn it on"}
                </p>
              </div>
            </div>
          )}
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-zinc-800/90">
              <div className="flex items-center gap-2 rounded-lg bg-zinc-700 px-4 py-2">
                <svg className="h-4 w-4 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span className="text-sm text-white">Requesting access…</span>
              </div>
            </div>
          )}
          <span className="absolute bottom-2 right-2 rounded bg-black/50 px-2 py-1 text-xs font-medium text-white/90">
            You
          </span>

          {/* Audio level indicator - bottom left corner */}
          {hasPermission && isMicEnabled && (
            <div className="absolute bottom-4 left-4 flex items-center gap-1">
              {[0, 1, 2].map((index) => (
                <div
                  key={index}
                  className="h-6 w-1 rounded-full bg-green-500 transition-all duration-100"
                  style={{
                    opacity: audioLevel > index * 30 ? 1 : 0.3,
                    height: audioLevel > index * 30 ? `${8 + index * 4}px` : "6px",
                  }}
                />
              ))}
            </div>
          )}

          {/* Control buttons overlay - bottom center */}
          {hasPermission && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3">
              {/* Microphone toggle */}
              <button
                onClick={toggleMic}
                className={`flex h-10 w-10 items-center justify-center rounded-lg border-2 border-white transition-all ${
                  isMicEnabled
                    ? "bg-green-500/30 text-white hover:bg-green-500/50"
                    : "bg-red-500/30 text-white hover:bg-red-500/50"
                }`}
                title={isMicEnabled ? "Turn off microphone" : "Turn on microphone"}
              >
                {isMicEnabled ? (
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z" clipRule="evenodd" />
                  </svg>
                )}
              </button>

              {/* Camera toggle */}
              <button
                onClick={toggleCamera}
                className={`flex h-10 w-10 items-center justify-center rounded-lg border-2 border-white transition-all ${
                  isCameraEnabled
                    ? "bg-green-500/30 text-white hover:bg-green-500/50"
                    : "bg-red-500/30 text-white hover:bg-red-500/50"
                }`}
                title={isCameraEnabled ? "Turn off camera" : "Turn on camera"}
              >
                {isCameraEnabled ? (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                  </svg>
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
              defaultValue={audioInputs[0]?.deviceId || ""}
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
              defaultValue={audioOutputs[0]?.deviceId || ""}
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
              defaultValue={videoInputs[0]?.deviceId || ""}
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

        {/* Initial permission request */}
        {!hasPermission && !isLoading && (
          <div className="rounded-2xl border border-zinc-200 bg-white p-5">
            <div className="mb-4">
              <p className="text-sm font-medium text-zinc-900">
                Do you want to be seen and heard in the interview?
              </p>
              <button
                type="button"
                onClick={() => requestPermissions()}
                disabled={isLoading}
                className="mt-3 rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Allow microphone and camera
              </button>
              {error && (
                <p className="mt-2 text-xs text-red-600">{error}</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Right: Ready to join + Join now below */}
      <div className="w-full rounded-2xl bg-white p-6 lg:w-80 lg:shrink-0">
        <h2 className="text-center text-lg font-semibold text-zinc-900">Ready to join?</h2>
        <button
          type="button"
          onClick={onPermissionsGranted}
          disabled={hasPermission !== true}
          className="mt-6 w-full rounded-lg bg-zinc-900 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Join now
        </button>
      </div>
    </div>
  );
}
