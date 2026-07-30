"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { selectSttEngine } from "@/lib/stt/browser-stt";
import { createWebSpeechEngine } from "@/lib/stt/web-speech-engine";
import { createLocalSttEngine } from "@/lib/stt/local-stt-engine";
import { createMicRecorder } from "@/lib/stt/capture";
import { getSharedMoonshineWorkerClient } from "@/lib/stt/moonshine-worker-client";
import { initialSttState, type SttEngine, type SttState } from "@/lib/stt/stt-engine";
import type { SttWorkerStatus } from "@/lib/stt/stt-messages";

const UNSUPPORTED_MESSAGE =
  "Speech recognition is unavailable in this browser. Use Chrome or Edge for voice answers.";

export function useSpeechRecognition(options?: { audioDeviceId?: string }) {
  const [state, setState] = useState<SttState>(initialSttState);
  const [hasSupport, setHasSupport] = useState<boolean>(() => selectSttEngine() !== "none");
  const [sttStatus, setSttStatus] = useState<SttWorkerStatus>("idle");

  const engineRef = useRef<SttEngine | null>(null);
  const recordingRef = useRef(false);
  recordingRef.current = state.isRecording;
  // Read at recording start (not at mount), so the latest selected mic wins.
  const audioDeviceIdRef = useRef<string | undefined>(options?.audioDeviceId);
  audioDeviceIdRef.current = options?.audioDeviceId;

  useEffect(() => {
    const choice = selectSttEngine();

    if (choice === "none") {
      setHasSupport(false);
      setSttStatus("error");
      setState((prev) => ({ ...prev, error: UNSUPPORTED_MESSAGE }));
      return;
    }

    let engine: SttEngine;
    let unsubscribeStatus: (() => void) | undefined;

    if (choice === "web-speech") {
      engine = createWebSpeechEngine();
      // No model to download — Web Speech is ready as soon as it exists.
      setSttStatus(engine.hasSupport ? "ready" : "error");
    } else {
      const client = getSharedMoonshineWorkerClient();
      engine = createLocalSttEngine({
        createRecorder: () => createMicRecorder(audioDeviceIdRef.current),
        client,
      });
      unsubscribeStatus = client.subscribe(setSttStatus);
      // Preload the model during PreJoin so it's cached before the interview.
      // Failures surface through the status subscription above.
      void client.preload().catch(() => {});
    }

    engineRef.current = engine;
    setHasSupport(engine.hasSupport);
    const unsubscribe = engine.subscribe(setState);

    return () => {
      unsubscribe();
      unsubscribeStatus?.();
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  const startRecording = useCallback(() => {
    engineRef.current?.start();
  }, []);

  const stopRecording = useCallback(() => {
    engineRef.current?.stop();
  }, []);

  const toggleRecording = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;
    if (recordingRef.current) engine.stop();
    else engine.start();
  }, []);

  return {
    isRecording: state.isRecording,
    interimTranscript: state.interimTranscript,
    volatileTranscript: state.volatileTranscript,
    finalTranscriptBlock: state.finalTranscriptBlock,
    speechError: state.error,
    hasSupport,
    sttStatus,
    startRecording,
    stopRecording,
    toggleRecording,
  };
}
