"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import PermissionRequest from "@/components/interview/PermissionRequest";
import { useMediaPermissions } from "@/lib/useMediaPermissions";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";

export default function InterviewPage() {
  const params = useParams();
  const router = useRouter();
  const interviewId = params.uuid as string;
  const [showPreJoin, setShowPreJoin] = useState(true);
  const [interviewStarted, setInterviewStarted] = useState(false);

  // Dummy Chat State
  const [messages, setMessages] = useState<{ role: 'ai' | 'user'; text: string }[]>([
    { role: 'ai', text: 'Welcome to your interview. Tell me about a time when you had to handle a challenging project deadline.' }
  ]);

  // Audio Transcription Hook
  const {
    isRecording,
    toggleRecording,
    interimTranscript,
    volatileTranscript,
    finalTranscriptBlock
  } = useSpeechRecognition();

  // Commit finalized text blocks to the standard chat log dynamically
  useEffect(() => {
    if (finalTranscriptBlock) {
      setMessages(prev => [...prev, { role: 'user', text: finalTranscriptBlock }]);
    }
  }, [finalTranscriptBlock]);

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
            <div className="mb-8 flex items-start justify-start">
              <button
                onClick={() => {
                  stopStream();
                  router.push("/practice");
                }}
                className="mb-4 flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 hover:border-zinc-300"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
                Back
              </button>
            </div>
            <div className="mb-8">
              <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Join interview</h1>
              <p className="mt-1 text-sm text-zinc-500">Allow camera and microphone, then join when you're ready.</p>
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
        <div className="h-screen w-full overflow-hidden bg-[#1c1c1e] flex flex-col p-4 sm:p-6 font-sans gap-4 sm:gap-6 relative">

          {/* Main Container */}
          <div className="w-full h-full relative flex flex-col gap-4 sm:gap-6 overflow-hidden max-w-[1600px] mx-auto">

            {/* Top Header */}
            <div className="relative flex items-center justify-center pl-2 pr-4 h-12 shrink-0">
              {/* Center: Timer Bar */}
              <div className="flex flex-col gap-2 w-full max-w-[400px]">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold tracking-wider text-zinc-400">Time Remaining</span>
                  <span className="text-[11px] font-semibold tracking-wider text-zinc-400">3:45 / 5:00</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
                  <div className="h-full w-[75%] rounded-full bg-blue-500" />
                </div>
              </div>

              {/* Right: Exit Button */}
              <div className="absolute right-4 top-1/2 -translate-y-1/2">
                <button
                  onClick={handleExitInterview}
                  className="rounded-full border border-zinc-700 bg-zinc-800/40 px-5 py-2 text-xs font-semibold text-zinc-300 transition-colors hover:bg-zinc-700 hover:text-white"
                >
                  Exit Interview
                </button>
              </div>
            </div>

            {/* Main Content Area (Video + Chat) */}
            <div className="flex w-full flex-1 min-h-0 gap-6 relative">

              {/* Left: Video Container */}
              <div className="relative w-full lg:w-[70%] flex-col flex overflow-hidden rounded-2xl border-2 border-cyan-400/80 bg-black shadow-[0_0_20px_rgba(34,211,238,0.2)] shrink-0">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="h-full w-full object-cover"
                  style={{ transform: "scaleX(-1)" }}
                />
                <div className="absolute right-5 top-5 flex items-center gap-2 rounded-full bg-zinc-800/80 px-3 py-1.5 backdrop-blur-md">
                  <div className={`h-[6px] w-[6px] rounded-full ${isRecording ? 'bg-red-500 animate-[pulse_1.5s_ease-in-out_infinite]' : 'bg-red-500'}`} />
                  <span className="text-[11px] font-semibold tracking-wide text-zinc-100">Recording</span>
                </div>
              </div>

              {/* Right: Chat Transcript */}
              <div className="hidden lg:flex flex-col flex-1 bg-zinc-800/20 rounded-2xl border border-zinc-800/50 overflow-hidden relative">
                {/* Fade overlays for smooth scrolling look */}
                <div className="absolute top-0 w-full h-8 bg-gradient-to-b from-[#1c1c1e] to-transparent z-10 pointer-events-none" />
                <div className="flex-1 overflow-y-auto p-5 space-y-5 flex flex-col pt-8 pb-12">
                  {messages.map((msg, idx) => (
                    <div key={idx} className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[85%] rounded-[18px] px-5 py-3.5 text-sm leading-relaxed tracking-wide shadow-sm ${msg.role === 'user'
                        ? 'bg-blue-600/90 text-white rounded-br-sm'
                        : 'bg-zinc-800/90 text-zinc-100 rounded-bl-sm ring-1 ring-white/5'
                        }`}>
                        {msg.text}
                      </div>
                    </div>
                  ))}
                  {(interimTranscript || volatileTranscript) && (
                    <div className="flex w-full justify-end">
                      <div className="max-w-[85%] rounded-[18px] px-5 py-3.5 text-sm leading-relaxed tracking-wide shadow-sm bg-blue-600/50 text-white rounded-br-sm animate-pulse">
                        {interimTranscript} <span className="opacity-70">{volatileTranscript}</span>
                      </div>
                    </div>
                  )}
                </div>
                <div className="absolute bottom-0 w-full h-12 bg-gradient-to-t from-[#1c1c1e] to-transparent z-10 pointer-events-none" />
              </div>

            </div>

            {/* Controls Area (Below Video) */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 px-2 mt-2">

              {/* Centered Recording Controls */}
              <div className="flex items-center gap-4">
                <button
                  onClick={toggleMic}
                  className={`flex h-12 w-12 items-center justify-center rounded-full transition-colors shadow-lg ${hasPermission && isMicEnabled
                    ? 'bg-emerald-500 text-white hover:bg-emerald-600 ring-2 ring-emerald-500/20'
                    : 'bg-zinc-800 text-red-500 hover:bg-zinc-700'
                    }`}
                >
                  {hasPermission && isMicEnabled ? (
                    <svg className="h-[22px] w-[22px] translate-y-[-1px]" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" /></svg>
                  ) : (
                    <svg className="h-[22px] w-[22px] translate-y-[-1px]" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z" clipRule="evenodd" /></svg>
                  )}
                </button>
                <button
                  onClick={toggleCamera}
                  className={`flex h-12 w-12 items-center justify-center rounded-full transition-colors shadow-lg ${hasPermission && isCameraEnabled
                    ? 'bg-emerald-500 text-white hover:bg-emerald-600 ring-2 ring-emerald-500/20'
                    : 'bg-zinc-800 text-red-500 hover:bg-zinc-700'
                    }`}
                >
                  {hasPermission && isCameraEnabled ? (
                    <svg className="h-[22px] w-[22px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  ) : (
                    <svg className="h-[22px] w-[22px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                    </svg>
                  )}
                </button>
                <button
                  onClick={toggleRecording}
                  className={`flex items-center gap-3 rounded-[20px] shadow-lg border px-5 py-3.5 text-xs font-semibold tracking-wide transition-colors ${isRecording
                    ? 'border-zinc-700 bg-zinc-800/80 text-zinc-300 hover:bg-zinc-700'
                    : 'border-blue-600 bg-blue-600 text-white hover:bg-blue-700 ring-2 ring-blue-500/20'
                    }`}
                >
                  <div className={`h-2.5 w-2.5 rounded-[2px] ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-white rounded-full'}`} />
                  {isRecording ? 'Stop Speaking (Space)' : 'Start Speaking'}
                </button>
              </div>

            </div>

          </div>
        </div>
      )}
    </>
  );
}
