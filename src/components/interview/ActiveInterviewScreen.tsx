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
      className="h-screen w-full overflow-hidden bg-[#1c1c1e] flex flex-col p-4 sm:p-6 font-sans gap-4 sm:gap-6 relative z-0"
    >
      <div className="w-full h-full relative flex flex-col gap-4 sm:gap-6 overflow-hidden max-w-[1600px] mx-auto">
        <div className="relative flex items-center justify-center pl-2 pr-4 h-12 shrink-0">
          <div className="flex flex-col gap-2 w-full max-w-[400px]">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold tracking-wider text-zinc-400">Question Progress</span>
              <span className="text-[11px] font-semibold tracking-wider text-zinc-400">Q{answeredQuestions} / {totalQuestions}</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
              <div className="h-full rounded-full bg-blue-500 transition-all duration-300" style={{ width: `${questionProgressPercent}%` }} />
            </div>
          </div>

          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <button
              onClick={onExitInterview}
              disabled={isUploading || interviewDone}
              className="rounded-full border border-zinc-700 bg-zinc-800/40 px-5 py-2 text-xs font-semibold text-zinc-300 transition-colors hover:bg-zinc-700 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUploading ? "Uploading..." : "Exit Interview"}
            </button>
          </div>
        </div>

        <div className="flex w-full flex-1 min-h-0 gap-6 relative">
          <div className="relative w-full lg:w-[70%] flex-col flex overflow-hidden rounded-2xl border-2 border-cyan-400/80 bg-black shadow-[0_0_20px_rgba(34,211,238,0.2)] shrink-0">
            <video
              ref={onVideoMount}
              autoPlay
              playsInline
              muted
              className="h-full w-full object-cover"
              style={{ transform: "scaleX(-1)" }}
            />
            <div className="absolute right-5 top-5 flex items-center gap-2 rounded-full bg-zinc-800/80 px-3 py-1.5 backdrop-blur-md">
              <div className={`h-[6px] w-[6px] rounded-full ${isRecordingVideo ? 'bg-red-500 animate-[pulse_1.5s_ease-in-out_infinite]' : 'bg-zinc-500'}`} />
              <span className="text-[11px] font-semibold tracking-wide text-zinc-100">{isRecordingVideo ? 'Recording' : 'Not Recording'}</span>
            </div>
          </div>

          <div className="hidden lg:flex flex-col flex-1 bg-zinc-800/20 rounded-2xl border border-zinc-800/50 overflow-hidden relative">
            <div className="absolute top-0 w-full h-8 bg-gradient-to-b from-[#1c1c1e] to-transparent z-10 pointer-events-none" />
            <div ref={chatScrollContainerRef} className="flex-1 overflow-y-auto p-5 space-y-5 flex flex-col pt-8 pb-12">
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

              {currentStreamedText && (
                <div className="flex w-full justify-start">
                  <div className="max-w-[85%] rounded-[18px] px-5 py-3.5 text-sm leading-relaxed tracking-wide shadow-sm bg-zinc-800/90 text-zinc-100 rounded-bl-sm ring-1 ring-white/5">
                    {currentStreamedText}
                    <span className="inline-block w-1.5 h-4 ml-1 align-middle bg-zinc-400 animate-pulse" />
                  </div>
                </div>
              )}

              {isThinking && !currentStreamedText && (
                <div className="flex w-full justify-start">
                  <div className="max-w-[85%] rounded-[18px] px-5 py-3.5 text-sm leading-relaxed tracking-wide shadow-sm bg-zinc-800/90 text-zinc-400 rounded-bl-sm ring-1 ring-white/5 animate-pulse flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              )}
              {(interimTranscript || volatileTranscript) && (
                <div className="flex w-full justify-end">
                  <div className="max-w-[85%] rounded-[18px] px-5 py-3.5 text-sm leading-relaxed tracking-wide shadow-sm bg-blue-600/50 text-white rounded-br-sm animate-pulse">
                    {interimTranscript} <span className="opacity-70">{volatileTranscript}</span>
                  </div>
                </div>
              )}
              <div ref={chatBottomRef} />
            </div>
            <div className="absolute bottom-0 w-full h-12 bg-gradient-to-t from-[#1c1c1e] to-transparent z-10 pointer-events-none" />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-6 px-2 mt-2">
          <div className="flex items-center gap-4">
            <button
              onClick={toggleMic}
              className={`flex h-12 w-12 items-center justify-center rounded-full transition-colors shadow-lg ${hasPermission && isMicEnabled
                ? 'bg-emerald-500 text-white hover:bg-emerald-600 ring-2 ring-emerald-500/20'
                : 'bg-zinc-800 text-red-500 hover:bg-zinc-700'
                }`}
            >
              {hasPermission && isMicEnabled ? (
                <IconMicrophoneSolid className="h-[22px] w-[22px] translate-y-[-1px]" />
              ) : (
                <IconMicrophoneOffSolid className="h-[22px] w-[22px] translate-y-[-1px]" />
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
                <IconVideoCamera className="h-[22px] w-[22px]" />
              ) : (
                <IconVideoCameraOff className="h-[22px] w-[22px]" />
              )}
            </button>
            <button
              onClick={toggleRecording}
              disabled={!hasSpeechSupport}
              className={`flex items-center gap-3 rounded-[20px] shadow-lg border px-5 py-3.5 text-xs font-semibold tracking-wide transition-colors ${isRecording
                ? 'border-zinc-700 bg-zinc-800/80 text-zinc-300 hover:bg-zinc-700'
                : 'border-blue-600 bg-blue-600 text-white hover:bg-blue-700 ring-2 ring-blue-500/20'} ${!hasSpeechSupport
                ? 'cursor-not-allowed border-zinc-700 bg-zinc-800 text-zinc-500 ring-0 hover:bg-zinc-800'
                : ''}`}
              title={!hasSpeechSupport ? 'Speech recognition is unavailable in this browser.' : undefined}
            >
              <div className={`h-2.5 w-2.5 rounded-[2px] ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-white rounded-full'}`} />
              {isRecording ? 'Stop Speaking (Space)' : hasSpeechSupport ? 'Start Speaking' : 'Speech Unavailable'}
            </button>
          </div>
          {speechError && (
            <p className="text-center text-xs text-amber-300 max-w-xl">
              {speechError}
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
}
