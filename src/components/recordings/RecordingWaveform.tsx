"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  buildWaveformPeaks,
  formatReplayTime,
  type InterviewReplayTurnView,
} from "@/lib/interview/replay";

type RecordingWaveformProps = {
  sourceUrl: string;
  durationMs: number;
  currentTimeMs: number;
  replayTurns: InterviewReplayTurnView[];
  onSeek: (timeMs: number) => void;
  onDurationResolved?: (durationMs: number) => void;
};

const BAR_COUNT = 120;
const VIEWBOX_WIDTH = 600;
const VIEWBOX_HEIGHT = 64;

export function RecordingWaveform({
  sourceUrl,
  durationMs,
  currentTimeMs,
  replayTurns,
  onSeek,
  onDurationResolved,
}: RecordingWaveformProps) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [peaks, setPeaks] = useState<number[]>([]);
  const [decodedDurationMs, setDecodedDurationMs] = useState(0);
  const [waveformState, setWaveformState] = useState<"loading" | "ready" | "unavailable">("loading");

  useEffect(() => {
    if (!sourceUrl) return;
    const controller = new AbortController();
    let audioContext: AudioContext | null = null;

    async function decodeRecording() {
      setWaveformState("loading");
      setPeaks([]);
      try {
        const response = await fetch(sourceUrl, { signal: controller.signal });
        if (!response.ok) throw new Error(`Recording request failed: ${response.status}`);
        const encodedAudio = await response.arrayBuffer();
        if (controller.signal.aborted) return;

        audioContext = new AudioContext();
        const decoded = await audioContext.decodeAudioData(encodedAudio.slice(0));
        if (controller.signal.aborted) return;
        const audioDurationMs = Math.round(decoded.duration * 1000);
        if (audioDurationMs > 0) {
          setDecodedDurationMs(audioDurationMs);
          onDurationResolved?.(audioDurationMs);
        }
        const channels = Array.from(
          { length: decoded.numberOfChannels },
          (_, channelIndex) => decoded.getChannelData(channelIndex),
        );
        setPeaks(buildWaveformPeaks(channels, BAR_COUNT));
        setWaveformState("ready");
      } catch {
        if (!controller.signal.aborted) setWaveformState("unavailable");
      } finally {
        if (audioContext) void audioContext.close().catch(() => {});
      }
    }

    void decodeRecording();
    return () => controller.abort();
  }, [onDurationResolved, sourceUrl]);

  const effectiveDurationMs = durationMs > 0 ? durationMs : decodedDurationMs;
  const progress = effectiveDurationMs > 0
    ? Math.min(1, Math.max(0, currentTimeMs / effectiveDurationMs))
    : 0;
  const segments = useMemo(() => replayTurns.flatMap((turn, index) => {
    const items: Array<{ key: string; start: number; end: number; kind: "question" | "answer"; label: string }> = [];
    if (turn.questionStartMs !== null && turn.questionEndMs !== null) {
      items.push({
        key: `q-${turn.transcriptOrder}`,
        start: turn.questionStartMs,
        end: turn.questionEndMs,
        kind: "question",
        label: `Interviewer ${index + 1}`,
      });
    }
    if (turn.answerStartMs !== null && turn.answerEndMs !== null) {
      items.push({
        key: `a-${turn.transcriptOrder}`,
        start: turn.answerStartMs,
        end: turn.answerEndMs,
        kind: "answer",
        label: `Your answer ${index + 1}`,
      });
    }
    return items;
  }), [replayTurns]);

  const seekFromClientX = useCallback((clientX: number) => {
    const track = trackRef.current;
    if (!track || effectiveDurationMs <= 0) return;
    const bounds = track.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - bounds.left) / bounds.width));
    onSeek(Math.round(ratio * effectiveDurationMs));
  }, [effectiveDurationMs, onSeek]);

  const displayPeaks = peaks.length
    ? peaks
    : Array.from({ length: BAR_COUNT }, (_, index) => 0.16 + ((index * 17) % 9) / 60);

  return (
    <div className="space-y-2" aria-label="Interview audio waveform">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 text-[10px] text-[#8791A4]">
          <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-sky-400" />Interviewer</span>
          <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-violet-400" />You</span>
        </div>
        <div className="font-mono text-[10px] tabular-nums text-[#8791A4]">
          {formatReplayTime(currentTimeMs)} / {effectiveDurationMs ? formatReplayTime(effectiveDurationMs) : "--:--"}
        </div>
      </div>

      <div className="relative h-2 overflow-hidden rounded-full bg-white/[0.035]" aria-hidden="true">
        {segments.map((segment) => {
          if (effectiveDurationMs <= 0 || segment.end <= segment.start) return null;
          return (
            <span
              key={segment.key}
              className={`absolute inset-y-0 ${segment.kind === "question" ? "bg-sky-400/60" : "bg-violet-400/70"}`}
              style={{
                left: `${Math.min(100, (segment.start / effectiveDurationMs) * 100)}%`,
                width: `${Math.max(0.3, ((segment.end - segment.start) / effectiveDurationMs) * 100)}%`,
              }}
              title={`${segment.label}: ${formatReplayTime(segment.start)}–${formatReplayTime(segment.end)}`}
            />
          );
        })}
      </div>

      <div
        ref={trackRef}
        role="slider"
        tabIndex={0}
        aria-label="Seek through interview recording"
        aria-valuemin={0}
        aria-valuemax={Math.round(effectiveDurationMs / 1000)}
        aria-valuenow={Math.round(currentTimeMs / 1000)}
        aria-valuetext={`${formatReplayTime(currentTimeMs)} of ${formatReplayTime(effectiveDurationMs)}`}
        onClick={(event) => seekFromClientX(event.clientX)}
        onKeyDown={(event) => {
          if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
          event.preventDefault();
          onSeek(currentTimeMs + (event.key === "ArrowRight" ? 5000 : -5000));
        }}
        className="group relative h-16 cursor-grab overflow-hidden rounded-lg border border-white/[0.07] bg-[#0A0D16] outline-none active:cursor-grabbing focus-visible:ring-2 focus-visible:ring-blue-400/70"
      >
        <svg viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`} preserveAspectRatio="none" className="h-full w-full" aria-hidden="true">
          {displayPeaks.map((peak, index) => {
            const centerX = ((index + 0.5) / BAR_COUNT) * VIEWBOX_WIDTH;
            const height = Math.max(4, peak * (VIEWBOX_HEIGHT - 10));
            const played = (index + 0.5) / BAR_COUNT <= progress;
            return (
              <rect
                key={index}
                x={centerX - 1.45}
                y={(VIEWBOX_HEIGHT - height) / 2}
                width="2.9"
                height={height}
                rx="1.45"
                className={played ? "fill-blue-400" : "fill-slate-500/55"}
              />
            );
          })}
        </svg>

        <span
          className="pointer-events-none absolute inset-y-0 w-px bg-white shadow-[0_0_8px_rgba(96,165,250,0.8)]"
          style={{ left: `${progress * 100}%` }}
          aria-hidden="true"
        />

        {replayTurns.map((turn, index) => {
          const markerMs = turn.answerStartMs ?? turn.questionStartMs;
          if (markerMs === null || effectiveDurationMs <= 0) return null;
          return (
            <button
              key={turn.transcriptOrder}
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onSeek(Math.max(0, markerMs - 750));
              }}
              className="absolute bottom-1 h-4 min-w-4 -translate-x-1/2 cursor-pointer rounded-full border border-violet-300/50 bg-violet-500/80 px-1 font-mono text-[8px] text-white shadow-sm hover:bg-violet-400"
              style={{ left: `${Math.min(100, (markerMs / effectiveDurationMs) * 100)}%` }}
              aria-label={`Play answer ${index + 1} at ${formatReplayTime(markerMs)}`}
              title={`Answer ${index + 1} · ${formatReplayTime(markerMs)}`}
            >
              {index + 1}
            </button>
          );
        })}
      </div>

      <p className="min-h-4 text-[10px] text-[#687386]">
        {waveformState === "loading" && "Reading audio waveform…"}
        {waveformState === "ready" && "Click the waveform to seek · use arrow keys for 5-second steps"}
        {waveformState === "unavailable" && "Waveform decoding is unavailable for this recording; replay markers still work."}
      </p>
    </div>
  );
}
