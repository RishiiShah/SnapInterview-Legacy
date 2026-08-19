"use client";

import {
  useState,
  useCallback,
  type ReactNode,
  type RefObject,
  type KeyboardEvent,
} from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  IconMicrophoneOffSolid,
  IconMicrophoneSolid,
  IconVideoCamera,
  IconVideoCameraOff,
} from "@/components/ui/icons";
import type { CodingChallenge } from "@/lib/interview/coding-challenge";
import { InterviewCodingPanel } from "@/components/interview/InterviewCodingPanel";
import {
  InterviewWhiteboard,
  type InterviewWhiteboardRef,
  type WhiteboardExport,
} from "@/components/interview/InterviewWhiteboard";
type ChatMessage = {
  role: "ai" | "user";
  text: string;
  isSystem?: boolean;
};

type ActiveInterviewScreenProps = {
  answeredQuestions: number;
  totalQuestions: number;
  questionProgressPercent: number;
  timeRemainingFormatted?: string | null;
  timeProgressPercent?: number;
  isGraceWarningActive?: boolean;
  isUploading: boolean;
  interviewDone: boolean;
  onExitInterview: () => void;
  onVideoMount: (node: HTMLVideoElement | null) => void;
  isRecordingVideo: boolean;
  chatScrollContainerRef: RefObject<HTMLDivElement | null>;
  chatBottomRef: RefObject<HTMLDivElement | null>;
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
  audioLevels: [number, number, number];
  toggleMic: () => void;
  toggleCamera: () => void;
  toggleRecording: () => void;
  onSendTextAnswer: (text: string) => void;
  interviewType?: string;
  codingInterview?: boolean;
  codingChallenge?: CodingChallenge | null;
  onSubmitCode?: (message: string) => void;
  whiteboardRef?: RefObject<InterviewWhiteboardRef | null>;
  onShareWhiteboard?: (exported: WhiteboardExport) => void;
  isSharingWhiteboard?: boolean;
};

export default function ActiveInterviewScreen({
  answeredQuestions,
  totalQuestions,
  questionProgressPercent,
  timeRemainingFormatted,
  timeProgressPercent,
  isGraceWarningActive,
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
  audioLevels,
  toggleMic,
  toggleCamera,
  toggleRecording,
  onSendTextAnswer,
  interviewType,
  codingInterview = false,
  codingChallenge,
  onSubmitCode,
  whiteboardRef,
  onShareWhiteboard,
  isSharingWhiteboard = false,
}: ActiveInterviewScreenProps) {
  const reducedMotion = useReducedMotion() ?? false;
  const [textDraft, setTextDraft] = useState("");
  const codingLayout = shouldUseCodingLayout(codingInterview, codingChallenge);
  const isSystemDesign = interviewType === "system-design";
  const hasSidePanel = codingLayout || isSystemDesign;

  const handleTextSubmit = useCallback(() => {
    const trimmed = textDraft.trim();
    if (!trimmed || interviewDone) return;
    onSendTextAnswer(trimmed);
    setTextDraft("");
  }, [textDraft, interviewDone, onSendTextAnswer]);

  const handleTextKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleTextSubmit();
      }
    },
    [handleTextSubmit],
  );

  const transcript = (
    <TranscriptPanel
      chatScrollContainerRef={chatScrollContainerRef}
      chatBottomRef={chatBottomRef}
      messages={messages}
      currentStreamedText={currentStreamedText}
      isThinking={isThinking}
      interimTranscript={interimTranscript}
      volatileTranscript={volatileTranscript}
      compact={hasSidePanel}
    />
  );

  return (
    <motion.div
      key="interview"
      initial={reducedMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={reducedMotion ? undefined : { opacity: 0 }}
      transition={{ duration: reducedMotion ? 0 : 0.35, ease: "easeOut" }}
      className="relative z-0 flex h-screen w-full flex-col overflow-hidden bg-[#090A0F] text-[#F2F4F8] antialiased"
    >
      <div className="mx-auto flex h-full w-full max-w-[1600px] flex-col overflow-hidden">
        {/* Top chrome — progress + exit */}
        <header className="flex shrink-0 items-center justify-between gap-6 border-b border-white/[0.06] px-5 py-3.5 sm:px-6">
          <div className="flex min-w-0 flex-1 flex-col gap-2 max-w-xs sm:max-w-sm">
            <div className="flex items-baseline justify-between gap-3">
              <span className="font-mono text-[11px] tabular-nums text-[#6B7385]">
                {timeRemainingFormatted ? "Time Remaining" : "Progress"}
              </span>
              <span
                className={`font-mono text-[11px] tabular-nums ${
                  isGraceWarningActive
                    ? "font-semibold text-amber-400 animate-pulse"
                    : "text-[#8B93A7]"
                }`}
              >
                {timeRemainingFormatted ?? `${answeredQuestions} / ${totalQuestions}`}
                {isGraceWarningActive ? " (Ending Soon)" : ""}
              </span>
            </div>
            <div className="h-px w-full overflow-hidden bg-white/[0.08]">
              <div
                className={`h-full transition-[width] duration-500 ease-out motion-reduce:transition-none ${
                  isGraceWarningActive ? "bg-amber-400" : "bg-[#3B82F6]"
                }`}
                style={{ width: `${timeProgressPercent ?? questionProgressPercent}%` }}
              />
            </div>
          </div>

          <button
            type="button"
            onClick={onExitInterview}
            disabled={isUploading || interviewDone}
            className="shrink-0 cursor-pointer text-[13px] text-[#A8B0C2] transition-colors hover:text-[#E8ECF4] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isUploading ? "Uploading…" : "Exit"}
          </button>
        </header>

        {isGraceWarningActive && (
          <div className="bg-amber-500/10 border-b border-amber-500/20 px-5 py-1.5 text-center text-xs font-medium text-amber-300">
            Interview time is almost up. Wrap up your current response.
          </div>
        )}

        {/* Stage */}
        <div className="relative flex min-h-0 flex-1 gap-0">
          {codingLayout ? (
            <>
              <div className="flex w-[38%] min-w-[280px] max-w-md flex-col border-r border-white/[0.06]">
                <div className="relative h-36 shrink-0 overflow-hidden border-b border-white/[0.06] bg-[#0B0C10] sm:h-40">
                  <video
                    ref={onVideoMount}
                    autoPlay
                    playsInline
                    muted
                    className="h-full w-full object-cover"
                    style={{ transform: "scaleX(-1)" }}
                  />
                  <RecordingBadge compact recording={isRecordingVideo} />
                </div>
                <div className="min-h-0 flex-1">{transcript}</div>
              </div>

              <div className="min-h-0 min-w-0 flex-1 p-3 sm:p-4">
                {codingChallenge ? (
                  <InterviewCodingPanel
                    challenge={codingChallenge}
                    onSubmitCode={onSubmitCode!}
                  />
                ) : (
                  <div className="flex h-full items-center justify-center rounded-xl border border-white/[0.08] bg-[#12141A]/90 px-6 text-center">
                    <p className="text-sm text-[#8B93A7]">Preparing coding challenge…</p>
                  </div>
                )}
              </div>
            </>
          ) : isSystemDesign ? (
            <>
              <div className="flex w-[38%] min-w-[280px] max-w-md flex-col border-r border-white/[0.06]">
                <div className="relative h-36 shrink-0 overflow-hidden border-b border-white/[0.06] bg-[#0B0C10] sm:h-40">
                  <video
                    ref={onVideoMount}
                    autoPlay
                    playsInline
                    muted
                    className="h-full w-full object-cover"
                    style={{ transform: "scaleX(-1)" }}
                  />
                  <RecordingBadge compact recording={isRecordingVideo} />
                </div>
                <div className="min-h-0 flex-1">{transcript}</div>
              </div>

              <div className="min-h-0 min-w-0 flex-1">
                <InterviewWhiteboard
                  ref={whiteboardRef}
                  onShareBoard={onShareWhiteboard}
                  isSharing={isSharingWhiteboard}
                  disabled={interviewDone}
                />
              </div>
            </>
          ) : (
            <>
              <div className="relative flex min-h-0 min-w-0 flex-1 flex-col bg-[#0B0C10]">
                <video
                  ref={onVideoMount}
                  autoPlay
                  playsInline
                  muted
                  className="h-full w-full object-cover"
                  style={{ transform: "scaleX(-1)" }}
                />
                <RecordingBadge recording={isRecordingVideo} />
                {!isCameraEnabled || hasPermission === false ? (
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-[#0B0C10]/70">
                    <p className="text-[13px] text-[#8B93A7]">
                      {hasPermission === false ? "Camera unavailable" : "Camera off"}
                    </p>
                  </div>
                ) : null}
              </div>

              <aside className="hidden min-h-0 w-[min(360px,32%)] shrink-0 flex-col border-l border-white/[0.06] bg-[#0C0E14] lg:flex">
                {transcript}
              </aside>
            </>
          )}
        </div>

        {/* Control bar */}
        <footer className="shrink-0 border-t border-white/[0.06] bg-[#090A0F]">
          <div className="flex flex-col items-center gap-2 px-4 py-3.5 sm:px-6">
            {hasSpeechSupport ? (
              <div className="flex items-center gap-2.5">
                <ControlIconButton
                  onClick={toggleMic}
                  active={Boolean(hasPermission && isMicEnabled)}
                  danger={!hasPermission || !isMicEnabled}
                  title={isMicEnabled ? "Mute microphone" : "Unmute microphone"}
                >
                  {hasPermission && isMicEnabled ? (
                    <IconMicrophoneSolid className="h-5 w-5" />
                  ) : (
                    <IconMicrophoneOffSolid className="h-5 w-5" />
                  )}
                </ControlIconButton>

                {hasPermission && isMicEnabled ? (
                  <div className="flex h-5 items-end gap-0.5" aria-hidden>
                    {audioLevels.map((level, i) => (
                      <div
                        key={i}
                        className="w-1 rounded-full bg-[#3B82F6] transition-all duration-75 ease-out motion-reduce:transition-none"
                        style={{
                          height: `${Math.max(3, (level / 100) * 20)}px`,
                          opacity: level > 5 ? 0.95 : 0.35,
                        }}
                      />
                    ))}
                  </div>
                ) : null}

                <ControlIconButton
                  onClick={toggleCamera}
                  active={Boolean(hasPermission && isCameraEnabled)}
                  title={isCameraEnabled ? "Turn off camera" : "Turn on camera"}
                >
                  {hasPermission && isCameraEnabled ? (
                    <IconVideoCamera className="h-5 w-5" />
                  ) : (
                    <IconVideoCameraOff className="h-5 w-5" />
                  )}
                </ControlIconButton>

                <div className="mx-1 h-6 w-px bg-white/[0.1]" aria-hidden />

                <button
                  type="button"
                  onClick={toggleRecording}
                  className={`inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg px-4 text-[13px] font-medium transition-colors ${
                    isRecording
                      ? "border border-white/[0.12] bg-white/[0.04] text-[#E8ECF4] hover:bg-white/[0.07]"
                      : "bg-[#3B82F6] text-white hover:bg-[#4B8FF7]"
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                      isRecording
                        ? "bg-rose-400 motion-safe:animate-pulse"
                        : "bg-white"
                    }`}
                  />
                  {isRecording ? "Stop speaking" : "Start speaking"}
                </button>
              </div>
            ) : (
              <div className="flex w-full max-w-2xl flex-col gap-2.5">
                <div className="flex items-center gap-2.5">
                  <ControlIconButton
                    onClick={toggleMic}
                    active={Boolean(hasPermission && isMicEnabled)}
                    danger={!hasPermission || !isMicEnabled}
                    compact
                    title={isMicEnabled ? "Mute microphone" : "Unmute microphone"}
                  >
                    {hasPermission && isMicEnabled ? (
                      <IconMicrophoneSolid className="h-4 w-4" />
                    ) : (
                      <IconMicrophoneOffSolid className="h-4 w-4" />
                    )}
                  </ControlIconButton>
                  <ControlIconButton
                    onClick={toggleCamera}
                    active={Boolean(hasPermission && isCameraEnabled)}
                    compact
                    title={isCameraEnabled ? "Turn off camera" : "Turn on camera"}
                  >
                    {hasPermission && isCameraEnabled ? (
                      <IconVideoCamera className="h-4 w-4" />
                    ) : (
                      <IconVideoCameraOff className="h-4 w-4" />
                    )}
                  </ControlIconButton>
                  <div className="h-5 w-px bg-white/[0.1]" aria-hidden />
                  <span className="text-[12px] text-[#8B93A7]">
                    Voice unavailable. Type your answer below.
                  </span>
                </div>
                <div className="flex gap-2">
                  <textarea
                    value={textDraft}
                    onChange={(e) => setTextDraft(e.target.value)}
                    onKeyDown={handleTextKeyDown}
                    disabled={interviewDone}
                    placeholder="Type your answer… (Enter to submit, Shift+Enter for new line)"
                    rows={3}
                    className="flex-1 resize-none rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 text-sm leading-relaxed text-[#E8ECF4] placeholder-[#6B7385] outline-none transition-colors focus:border-[#3B82F6]/60 disabled:opacity-40"
                  />
                  <button
                    type="button"
                    onClick={handleTextSubmit}
                    disabled={!textDraft.trim() || interviewDone}
                    className="self-end cursor-pointer rounded-lg bg-[#3B82F6] px-4 py-2.5 text-[13px] font-medium text-white transition-colors hover:bg-[#4B8FF7] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Submit
                  </button>
                </div>
              </div>
            )}

            {speechError ? (
              <p className="max-w-xl text-center text-[12px] text-amber-200/90">
                {speechError}
              </p>
            ) : null}
          </div>
        </footer>
      </div>
    </motion.div>
  );
}

export function shouldUseCodingLayout(
  codingInterview: boolean,
  codingChallenge: CodingChallenge | null | undefined,
) {
  return codingInterview || Boolean(codingChallenge);
}

function RecordingBadge({
  recording,
  compact,
}: {
  recording: boolean;
  compact?: boolean;
}) {
  return (
    <div
      className={`absolute flex items-center gap-1.5 ${
        compact ? "right-2.5 top-2.5" : "right-4 top-4"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          recording
            ? "bg-rose-500 motion-safe:animate-pulse"
            : "bg-white/25"
        }`}
      />
      <span className="font-mono text-[10px] tracking-wide text-[#C5CBD8]/90">
        {recording ? (compact ? "REC" : "Recording") : compact ? "OFF" : "Not recording"}
      </span>
    </div>
  );
}

function ControlIconButton({
  children,
  onClick,
  active,
  danger,
  compact,
  title,
}: {
  children: ReactNode;
  onClick: () => void;
  active?: boolean;
  danger?: boolean;
  compact?: boolean;
  title?: string;
}) {
  const size = compact ? "h-9 w-9" : "h-11 w-11";
  let tone =
    "border-white/[0.14] bg-white/[0.04] text-[#F2F4F8] hover:bg-white/[0.08]";
  if (danger) {
    tone =
      "border-rose-400/35 bg-rose-500/20 text-rose-50 hover:bg-rose-500/30";
  } else if (!active) {
    tone =
      "border-white/[0.1] bg-white/[0.02] text-[#A8B0C2] hover:bg-white/[0.06] hover:text-[#E8ECF4]";
  }

  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`flex ${size} cursor-pointer items-center justify-center rounded-xl border transition-colors ${tone}`}
    >
      {children}
    </button>
  );
}

function TranscriptPanel({
  chatScrollContainerRef,
  chatBottomRef,
  messages,
  currentStreamedText,
  isThinking,
  interimTranscript,
  volatileTranscript,
  compact,
}: {
  chatScrollContainerRef: RefObject<HTMLDivElement | null>;
  chatBottomRef: RefObject<HTMLDivElement | null>;
  messages: ChatMessage[];
  currentStreamedText: string;
  isThinking: boolean;
  interimTranscript: string;
  volatileTranscript: string;
  compact?: boolean;
}) {
  const pad = compact ? "px-3.5 py-3" : "px-4 py-4";
  const bubble = compact ? "px-3 py-2 text-[13px]" : "px-3.5 py-2.5 text-sm";

  return (
    <div className="relative flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-center justify-between border-b border-white/[0.06] px-4 py-2.5">
        <p className="font-mono text-[11px] tabular-nums text-[#6B7385]">Transcript</p>
      </div>

      <div
        ref={chatScrollContainerRef}
        className={`flex min-h-0 flex-1 flex-col space-y-3 overflow-y-auto ${pad}`}
      >
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex w-full ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[92%] rounded-xl leading-relaxed ${bubble} ${
                msg.role === "user"
                  ? "bg-[#3B82F6] text-white"
                  : "border border-white/[0.06] bg-white/[0.03] text-[#E8ECF4]"
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}

        {currentStreamedText ? (
          <div className="flex w-full justify-start">
            <div
              className={`max-w-[92%] rounded-xl border border-white/[0.06] bg-white/[0.03] leading-relaxed text-[#E8ECF4] ${bubble}`}
            >
              {currentStreamedText}
              <span className="ml-1 inline-block h-3.5 w-0.5 align-middle rounded-sm bg-[#A8B0C2] motion-safe:animate-pulse" />
            </div>
          </div>
        ) : null}

        {isThinking && !currentStreamedText ? (
          <div className="flex w-full justify-start">
            <div
              className={`flex max-w-[92%] items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.03] text-[#8B93A7] ${bubble}`}
            >
              <span className="font-mono text-xs text-[#8B93A7]">Taking notes…</span>
              <span className="h-1.5 w-1.5 rounded-full bg-blue-400 motion-safe:animate-pulse" />
            </div>
          </div>
        ) : null}

        {interimTranscript || volatileTranscript ? (
          <div className="flex w-full justify-end">
            <div
              className={`max-w-[92%] rounded-xl border border-[#3B82F6]/25 bg-[#3B82F6]/15 leading-relaxed text-[#E8ECF4] ${bubble}`}
            >
              {interimTranscript}{" "}
              <span className="opacity-55">{volatileTranscript}</span>
            </div>
          </div>
        ) : null}

        <div ref={chatBottomRef} />
      </div>
    </div>
  );
}
