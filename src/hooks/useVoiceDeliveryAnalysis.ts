"use client";

import { useCallback, useEffect, useRef } from "react";
import { countFillerWords, type VoiceTurnInput } from "@/lib/interview/voice-analysis";

type ActiveTurn = {
  transcriptOrder: number;
  readyAt: number;
  firstSpeechAt: number | null;
  lastSampleAt: number;
  voicedDurationMs: number;
  pauseDurationMs: number;
  voicedSamples: number;
  totalSamples: number;
  clippedSamples: number;
  silentSamples: number;
  noiseFloor: number;
  energies: number[];
};

function createActiveTurn(transcriptOrder: number, now = performance.now()): ActiveTurn {
  return {
    transcriptOrder,
    readyAt: now,
    firstSpeechAt: null,
    lastSampleAt: now,
    voicedDurationMs: 0,
    pauseDurationMs: 0,
    voicedSamples: 0,
    totalSamples: 0,
    clippedSamples: 0,
    silentSamples: 0,
    noiseFloor: 0.004,
    energies: [],
  };
}

function standardDeviation(values: number[]): number {
  if (!values.length) return 0;
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  return Math.sqrt(values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length);
}

export function useVoiceDeliveryAnalysis({
  interviewId,
  stream,
  enabled,
  isMicEnabled,
  onSpeechStarted,
}: {
  interviewId: string;
  stream: MediaStream | null;
  enabled: boolean;
  isMicEnabled: boolean;
  onSpeechStarted?: (transcriptOrder: number) => void;
}) {
  const activeTurnRef = useRef<ActiveTurn | null>(null);

  const markQuestionReady = useCallback((transcriptOrder: number) => {
    if (!enabled) return;
    activeTurnRef.current = createActiveTurn(transcriptOrder);
  }, [enabled]);

  const captureAnswer = useCallback((answer: string, transcriptOrder: number) => {
    if (!enabled) return;
    const active = activeTurnRef.current;
    activeTurnRef.current = null;

    const words = answer.trim().split(/\s+/).filter(Boolean).length;
    const observedDurationMs = active?.totalSamples
      ? Math.max(0, performance.now() - active.readyAt)
      : 0;
    const speakingDurationMs = active
      ? active.voicedDurationMs > 0
        ? active.voicedDurationMs
        : observedDurationMs
      : 0;
    const meanEnergy = active?.energies.length
      ? active.energies.reduce((sum, value) => sum + value, 0) / active.energies.length
      : 0;
    const energyVariation = meanEnergy > 0 && active
      ? Math.min(2, standardDeviation(active.energies) / meanEnergy)
      : null;
    const voicedCoverage = active?.totalSamples
      ? active.voicedSamples / active.totalSamples
      : 0;
    const clippingRatio = active?.totalSamples
      ? active.clippedSamples / active.totalSamples
      : 0;
    const audioQualityScore = active
      ? Math.max(0, Math.min(1, 0.35 + voicedCoverage * 0.75 - clippingRatio * 1.5))
      : 0;
    const confidenceScore = active?.totalSamples
      ? Math.max(0, Math.min(1, audioQualityScore * (0.5 + Math.min(active.totalSamples / 10, 1) * 0.5)))
      : 0;

    const payload: VoiceTurnInput = {
      transcriptOrder,
      responseLatencyMs: !active
        ? null
        : Math.max(0, Math.round((active.firstSpeechAt ?? active.readyAt) - active.readyAt)),
      speakingDurationMs: speakingDurationMs > 0 ? Math.round(speakingDurationMs) : null,
      wordsPerMinute: speakingDurationMs >= 1_000
        ? Math.round((words / speakingDurationMs) * 60_000)
        : null,
      pauseRatio: active?.totalSamples
        ? Math.min(1, active.silentSamples / active.totalSamples)
        : null,
      energyVariation,
      fillerWordCount: countFillerWords(answer),
      audioQualityScore,
      confidenceScore,
    };

    void fetch(`/api/interview/${encodeURIComponent(interviewId)}/voice-analysis`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {
      // Delivery coaching is optional and must never interrupt the interview.
    });
  }, [enabled, interviewId]);

  useEffect(() => {
    if (!enabled || !stream || !isMicEnabled) return;

    const LegacyWindow = window as typeof window & { webkitAudioContext?: typeof AudioContext };
    const AudioContextCtor = window.AudioContext ?? LegacyWindow.webkitAudioContext;
    if (!AudioContextCtor) return;

    const audioContext = new AudioContextCtor();
    const analyser = audioContext.createAnalyser();
    const source = audioContext.createMediaStreamSource(stream);
    const samples = new Float32Array(512);
    analyser.fftSize = 512;
    source.connect(analyser);
    const resumeAudioContext = () => void audioContext.resume().catch(() => {
      // Sampling will retry naturally once the browser resumes the context.
    });
    resumeAudioContext();
    window.addEventListener("pointerdown", resumeAudioContext);
    window.addEventListener("keydown", resumeAudioContext);

    let frameId = 0;
    let lastMeasuredAt = 0;
    const sample = (now: number) => {
      frameId = requestAnimationFrame(sample);
      if (now - lastMeasuredAt < 80) return;
      lastMeasuredAt = now;

      const active = activeTurnRef.current;
      if (!active) return;
      analyser.getFloatTimeDomainData(samples);
      let squareSum = 0;
      let peak = 0;
      for (const value of samples) {
        squareSum += value * value;
        peak = Math.max(peak, Math.abs(value));
      }
      const rms = Math.sqrt(squareSum / samples.length);
      const elapsed = Math.min(250, Math.max(0, now - active.lastSampleAt));
      const speechFloor = Math.max(0.006, Math.min(0.02, active.noiseFloor * 2.5));
      const voiced = rms >= speechFloor;
      active.lastSampleAt = now;
      active.totalSamples += 1;
      active.energies.push(rms);
      if (peak >= 0.98) active.clippedSamples += 1;

      if (voiced) {
        if (active.firstSpeechAt === null) {
          active.firstSpeechAt = now;
          onSpeechStarted?.(active.transcriptOrder);
        }
        active.voicedSamples += 1;
        active.voicedDurationMs += elapsed;
      } else {
        active.silentSamples += 1;
        active.noiseFloor = active.noiseFloor * 0.92 + rms * 0.08;
        if (active.firstSpeechAt !== null) active.pauseDurationMs += elapsed;
      }
    };

    frameId = requestAnimationFrame(sample);
    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("pointerdown", resumeAudioContext);
      window.removeEventListener("keydown", resumeAudioContext);
      source.disconnect();
      analyser.disconnect();
      void audioContext.close();
    };
  }, [enabled, isMicEnabled, onSpeechStarted, stream]);

  return { markQuestionReady, captureAnswer };
}
