import { motion } from "framer-motion";
import {
  IconMicrophoneOffSolid,
  IconMicrophoneSolid,
  IconVideoCamera,
  IconVideoCameraOff,
} from "@/components/ui/icons";

type ChatMessage = {
  role: "ai" | "user";
  text: string;
  isSystem?: boolean;
};

type ActiveInterviewScreenProps = {
  answeredQuestions: number;
  totalQuestions: number;
  questionProgressPercent: number;
  isUploading: boolean;
  interviewDone: boolean;
  onExitInterview: () => void;
  onVideoMount: (node: HTMLVideoElement | null) => void;
  isRecordingVideo: boolean;
  chatScrollContainerRef: React.RefObject<HTMLDivElement | null>;
  chatBottomRef: React.RefObject<HTMLDivElement | null>;
  messages: ChatMessage[];
  currentStreamedText: string;
  isThinking: boolean;
  interimTranscript: string;
  volatileTranscript: string;
  hasPermission: boolean | null;
  isMicEnabled: boolean;
  isCameraEnabled: boolean;
  isRecording: boolean;
  hasSpeechSupport: boolean;
  speechError: string | null;
  toggleMic: () => void;
  toggleCamera: () => void;
  toggleRecording: () => void;
};

export default function ActiveInterviewScreen({
  answeredQuestions,
  totalQuestions,
  questionProgressPercent,
  isUploading,
  interviewDone,
  onExitInterview,
  onVideoMount,
  isRecordingVideo,
  chatScrollContainerRef,
  chatBottomRef,
  messages,
  currentStreamedText,
  isThinking,
  interimTranscript,
  volatileTranscript,
  hasPermission,
  isMicEnabled,
  isCameraEnabled,
  isRecording,
  hasSpeechSupport,
  speechError,
  toggleMic,
  toggleCamera,
  toggleRecording,
}: ActiveInterviewScreenProps) {
  return (
    <motion.div
      key="interview"
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="h-screen w-full overflow-hidden bg-zinc-950 flex flex-col p-4 sm:p-6 font-sans gap-4 sm:gap-5 relative z-0"
    >
      <div className="w-full h-full relative flex flex-col gap-4 sm:gap-5 overflow-hidden max-w-400 mx-auto">
        {/* Progress bar */}
        <div className="relative flex items-center justify-between px-1 h-10 shrink-0">
          <div className="flex flex-col gap-1.5 w-full max-w-100">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold tracking-wider text-zinc-500 uppercase">Progress</span>
              <span className="text-[11px] font-semibold tracking-wider text-zinc-500">
                {answeredQuestions} / {totalQuestions}
              </span>
            </div>
            <div className="h-1 w-full overflow-hidden rounded-full bg-zinc-800">
              <div
                className="h-full rounded-full bg-blue-500 transition-all duration-500"
                style={{ width: `${questionProgressPercent}%` }}
              />
            </div>
          </div>

          <button
            onClick={onExitInterview}
            disabled={isUploading || interviewDone}
            className="absolute right-0 top-1/2 -translate-y-1/2 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2 text-xs font-semibold text-zinc-400 transition-all hover:border-zinc-700 hover:bg-zinc-800 hover:text-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isUploading ? "Uploading…" : "Exit Interview"}
          </button>
        </div>

        {/* Main content: video + chat */}
        <div className="flex w-full flex-1 min-h-0 gap-5 relative">
          {/* Video feed */}
          <div className="relative w-full lg:w-[70%] flex-col flex overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 shadow-lg shadow-black/40 shrink-0">
            <video
              ref={onVideoMount}
              autoPlay
              playsInline
              muted
              className="h-full w-full object-cover"
              style={{ transform: "scaleX(-1)" }}
            />
            <div className="absolute right-4 top-4 flex items-center gap-2 rounded-full bg-zinc-900/80 px-3 py-1.5 backdrop-blur-sm border border-zinc-800/60">
              <div className={`h-1.5 w-1.5 rounded-full ${isRecordingVideo ? 'bg-red-500 animate-[pulse_1.5s_ease-in-out_infinite]' : 'bg-zinc-600'}`} />
              <span className="text-[11px] font-semibold tracking-wide text-zinc-300">
                {isRecordingVideo ? 'Recording' : 'Not Recording'}
              </span>
            </div>
          </div>

          {/* Chat panel */}
          <div className="hidden lg:flex flex-col flex-1 bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden relative">
            <div className="absolute top-0 w-full h-8 bg-linear-to-b from-zinc-950 to-transparent z-10 pointer-events-none" />
            <div ref={chatScrollContainerRef} className="flex-1 overflow-y-auto p-5 space-y-4 flex flex-col pt-8 pb-12">
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${msg.role === 'user'
                    ? 'bg-blue-600 text-white rounded-br-sm'
                    : 'bg-zinc-800 text-zinc-100 rounded-bl-sm ring-1 ring-white/5'
                    }`}>
                    {msg.text}
                  </div>
                </div>
              ))}

              {currentStreamedText && (
                <div className="flex w-full justify-start">
                  <div className="max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed bg-zinc-800 text-zinc-100 rounded-bl-sm ring-1 ring-white/5">
                    {currentStreamedText}
                    <span className="inline-block w-1 h-3.5 ml-1 align-middle bg-zinc-400 animate-pulse rounded-sm" />
                  </div>
                </div>
              )}

              {isThinking && !currentStreamedText && (
                <div className="flex w-full justify-start">
                  <div className="max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed bg-zinc-800 text-zinc-400 rounded-bl-sm ring-1 ring-white/5 flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              )}

              {(interimTranscript || volatileTranscript) && (
                <div className="flex w-full justify-end">
                  <div className="max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed bg-blue-600/40 text-white rounded-br-sm border border-blue-500/20 animate-pulse">
                    {interimTranscript} <span className="opacity-60">{volatileTranscript}</span>
                  </div>
                </div>
              )}
              <div ref={chatBottomRef} />
            </div>
            <div className="absolute bottom-0 w-full h-12 bg-linear-to-t from-zinc-950 to-transparent z-10 pointer-events-none" />
          </div>
        </div>

        {/* Control bar */}
        <div className="flex flex-col items-center gap-2.5 px-2 shrink-0">
          <div className="flex items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-900 px-5 py-3.5 shadow-lg shadow-black/20">
            <button
              onClick={toggleMic}
              className={`flex h-11 w-11 items-center justify-center rounded-xl transition-all ${hasPermission && isMicEnabled
                ? 'bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 ring-1 ring-emerald-500/30'
                : 'bg-red-500/10 text-red-400 hover:bg-red-500/20'
                }`}
            >
              {hasPermission && isMicEnabled ? (
                <IconMicrophoneSolid className="h-5 w-5" />
              ) : (
                <IconMicrophoneOffSolid className="h-5 w-5" />
              )}
            </button>
            <button
              onClick={toggleCamera}
              className={`flex h-11 w-11 items-center justify-center rounded-xl transition-all ${hasPermission && isCameraEnabled
                ? 'bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 ring-1 ring-emerald-500/30'
                : 'bg-red-500/10 text-red-400 hover:bg-red-500/20'
                }`}
            >
              {hasPermission && isCameraEnabled ? (
                <IconVideoCamera className="h-5 w-5" />
              ) : (
                <IconVideoCameraOff className="h-5 w-5" />
              )}
            </button>
            <div className="h-7 w-px bg-zinc-800" />
            <button
              onClick={toggleRecording}
              disabled={!hasSpeechSupport}
              className={`flex items-center gap-2.5 rounded-xl px-4 py-2.5 text-xs font-semibold tracking-wide transition-all ${isRecording
                ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                : 'bg-blue-600 text-white hover:bg-blue-700'} ${!hasSpeechSupport
                ? 'cursor-not-allowed opacity-40'
                : ''}`}
              title={!hasSpeechSupport ? 'Speech recognition is unavailable in this browser.' : undefined}
            >
              <div className={`h-2 w-2 rounded-full flex-shrink-0 ${isRecording ? 'bg-red-400 animate-pulse' : 'bg-white'}`} />
              {isRecording ? 'Stop Speaking' : hasSpeechSupport ? 'Start Speaking' : 'Unavailable'}
            </button>
          </div>
          {speechError && (
            <p className="text-center text-xs text-amber-400 max-w-xl">
              {speechError}
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
}
