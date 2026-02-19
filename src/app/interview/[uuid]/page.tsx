"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import PermissionRequest from "@/components/interview/PermissionRequest";
import { useMediaPermissions } from "@/lib/useMediaPermissions";

export default function InterviewPage() {
  const params = useParams();
  const router = useRouter();
  const interviewId = params.uuid as string;
  const [showPreJoin, setShowPreJoin] = useState(true);
  const [interviewStarted, setInterviewStarted] = useState(false);
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
    toggleMic,
    toggleCamera,
  } = useMediaPermissions();

  const handlePermissionsGranted = () => {
    setShowPreJoin(false);
    setInterviewStarted(true);
  };

  const handleExitInterview = () => {
    stopStream();
    router.push("/practice");
  };

  // Attach stream to the interview video when we switch to interview view (ref points to the new video element)
  useEffect(() => {
    if (!interviewStarted || !stream || !videoRef.current) return;
    videoRef.current.srcObject = stream;
  }, [interviewStarted, stream]);

  return (
    <>
      {/* Pre-join: standalone page — preview rectangle + options below, Ready to join to the right */}
      {showPreJoin && (
        <div className="min-h-screen w-full bg-white">
          <div className="mx-auto max-w-7xl px-6 py-12">
            <div className="mb-8">
              <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Join interview</h1>
              <p className="mt-1 text-sm text-zinc-500">Allow camera and microphone, then join when you’re ready.</p>
            </div>
            <PermissionRequest
              isOpen={true}
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
              toggleMic={toggleMic}
              toggleCamera={toggleCamera}
            />
          </div>
        </div>
      )}

      {/* Interview: full-screen session (user video + UI) */}
      {interviewStarted && (
        <div className="h-screen w-full bg-zinc-900">
          <div className="flex h-full flex-col">
          <div className="border-b border-zinc-700 bg-zinc-800 px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold text-white">Interview Session</h1>
                <p className="text-sm text-zinc-400">ID: {interviewId}</p>
              </div>
              <button
                onClick={handleExitInterview}
                className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Exit Interview
              </button>
            </div>
          </div>

          <div className="flex flex-1 gap-6 p-6">
            {/* User video playback */}
            <div className="flex-1">
              <div className="relative h-full overflow-hidden rounded-2xl bg-black">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="h-full w-full object-cover"
                  style={{ transform: "scaleX(-1)" }}
                />
                <div className="absolute bottom-4 right-4 flex gap-2">
                  <div className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium ${hasPermission && isMicEnabled ? "bg-green-500/20 text-green-300" : "bg-red-500/20 text-red-300"}`}>
                    <div className={`h-2 w-2 rounded-full ${hasPermission && isMicEnabled ? "bg-green-400" : "bg-red-400"}`} />
                    Microphone
                  </div>
                  <div className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium ${hasPermission && isCameraEnabled ? "bg-green-500/20 text-green-300" : "bg-red-500/20 text-red-300"}`}>
                    <div className={`h-2 w-2 rounded-full ${hasPermission && isCameraEnabled ? "bg-green-400" : "bg-red-400"}`} />
                    Camera
                  </div>
                </div>
              </div>
            </div>

            <div className="w-96 space-y-4">
              <div className="rounded-2xl bg-zinc-800 p-6">
                <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-zinc-400">Current Question</h2>
                <div className="rounded-lg bg-zinc-700 p-4">
                  <p className="text-lg font-medium text-white">
                    Tell me about a time when you had to handle a challenging project deadline.
                  </p>
                  <p className="mt-3 text-sm text-zinc-300">Type: Behavioral</p>
                </div>
              </div>

              <div className="rounded-2xl bg-zinc-800 p-6">
                <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-zinc-400">Time Remaining</h2>
                <div className="text-4xl font-bold text-white">2:45</div>
                <p className="mt-2 text-sm text-zinc-400">Out of 5:00</p>
              </div>

              <div className="flex items-center gap-2 rounded-lg bg-red-500/10 px-4 py-3">
                <div className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-500" />
                <p className="text-sm font-medium text-red-300">Recording</p>
              </div>

              <div className="flex gap-2">
                <button className="flex-1 rounded-lg bg-zinc-700 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-600">
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.172a1 1 0 011.414 0A6.972 6.972 0 0121 10c0 1.912-.586 3.68-1.586 5.172a1 1 0 11-1.414-1.414A5.971 5.971 0 0019 10a5.972 5.972 0 00-1.757-4.243 1 1 0 010-1.414z" />
                  </svg>
                </button>
                <button className="flex-1 rounded-lg bg-zinc-700 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-600">
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 11-2 0V5H5v10h8v-1a1 1 0 112 0v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4z" />
                  </svg>
                </button>
              </div>

              <div className="rounded-lg bg-blue-500/10 p-3">
                <p className="text-xs text-blue-200">
                  💡 <strong>Tip:</strong> Speak clearly and think out loud. The AI evaluator will assess your communication skills and problem-solving approach.
                </p>
              </div>
            </div>
          </div>
          </div>
        </div>
      )}
    </>
  );
}
