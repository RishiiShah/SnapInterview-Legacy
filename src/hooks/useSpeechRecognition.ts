"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { selectSttEngine } from "@/lib/stt/browser-stt";
import { createWebSpeechEngine } from "@/lib/stt/web-speech-engine";
import { createLocalSttEngine } from "@/lib/stt/local-stt-engine";
import { createMicRecorder } from "@/lib/stt/capture";
import { getSharedMoonshineWorkerClient } from "@/lib/stt/moonshine-worker-client";
import { initialSttState, type SttEngine, type SttState } from "@/lib/stt/stt-engine";

const UNSUPPORTED_MESSAGE =
  "Speech recognition is unavailable in this browser. Use Chrome or Edge for voice answers.";

export function useSpeechRecognition() {
  const [state, setState] = useState<SttState>(initialSttState);
  const [hasSupport, setHasSupport] = useState<boolean>(() => selectSttEngine() !== "none");

  const engineRef = useRef<SttEngine | null>(null);
  const recordingRef = useRef(false);
  recordingRef.current = state.isRecording;

  useEffect(() => {
    const choice = selectSttEngine();
    const engine =
      choice === "web-speech"
        ? createWebSpeechEngine()
        : choice === "local"
          ? createLocalSttEngine({
              createRecorder: () => createMicRecorder(),
              client: getSharedMoonshineWorkerClient(),
            })
          : null;

    if (!engine) {
      setHasSupport(false);
      setState((prev) => ({ ...prev, error: UNSUPPORTED_MESSAGE }));
      return;
    }

    engineRef.current = engine;
    setHasSupport(engine.hasSupport);
    const unsubscribe = engine.subscribe(setState);

    return () => {
      unsubscribe();
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
    startRecording,
    stopRecording,
    toggleRecording,
  };
}
