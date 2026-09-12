"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  createAudioBufferFromPcm,
  isLocalTtsEnabled,
  mergePendingTtsText,
  splitTtsText,
  type BrowserTtsEngine,
  type BrowserTtsStatus,
} from "@/lib/tts/browser-tts";
import { getSharedKokoroWorkerClient } from "@/lib/tts/kokoro-worker-client";

const STORAGE_KEY = "tts_muted";
const SPEED_STORAGE_KEY = "tts_speed";
const STREAMING_SPEECH_MAX_CHARS = 220;

const SPEECH_RATES: Record<string, number> = {
  slow: 0.85,
  normal: 1.0,
  fast: 1.25,
};

function getSpeechRate(): number {
  if (typeof window === "undefined") return SPEECH_RATES.normal;
  return SPEECH_RATES[localStorage.getItem(SPEED_STORAGE_KEY) ?? ""] ?? SPEECH_RATES.normal;
}

function stripMarkdown(text: string): string {
  return text
    // Bold and italic: strip markers, keep spoken content
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/__(.*?)__/g, "$1")
    .replace(/_(.*?)_/g, "$1")
    // Inline code: keep content
    .replace(/`{1,3}([^`]*)`{1,3}/g, "$1")
    // Headings: drop the # prefix
    .replace(/^#{1,6}\s+/gm, "")
    // Links: keep link text, drop URL
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    // Bare URLs: drop entirely (unpronounceable)
    .replace(/https?:\/\/\S+/g, "")
    // Normalize whitespace
    .replace(/\s+/g, " ")
    .trim();
}

function getOrCreateAudioContext(
  ref: React.MutableRefObject<AudioContext | null>
): AudioContext {
  if (!ref.current) {
    ref.current = new AudioContext();
  }
  if (ref.current.state === "suspended") {
    void ref.current.resume();
  }
  return ref.current;
}

export function useStreamingTTS({
  streamingText,
  completedText,
  enabled = true,
  persona,
  localTtsEnabled,
  ttsEngine,
}: {
  streamingText?: string;
  completedText: string;
  enabled?: boolean;
  persona?: string | null;
  localTtsEnabled?: boolean;
  ttsEngine?: BrowserTtsEngine;
}) {
  const localEnabled = localTtsEnabled ?? isLocalTtsEnabled();
  const personaRef = useRef(persona);

  useLayoutEffect(() => {
    personaRef.current = persona;
  }, [persona]);

  const [muted, setMutedState] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(STORAGE_KEY) === "1";
  });

  const mutedRef = useRef(muted);
  const audioContextRef = useRef<AudioContext | null>(null);
  const currentSourceRef = useRef<AudioBufferSourceNode | null>(null);
  
  // Pipelined double-queue: text waiting to be synthesized, audio buffers ready to play
  const textQueueRef = useRef<string[]>([]);
  const audioQueueRef = useRef<AudioBuffer[]>([]);
  
  const isSynthesizingRef = useRef(false);
  const isPlayingRef = useRef(false);
  const generationRef = useRef(0);

  const spokenPrefixRef = useRef("");
  const activeResponseRef = useRef("");
  const engineRef = useRef<BrowserTtsEngine | null>(null);
  const preloadPromiseRef = useRef<Promise<void> | null>(null);
  const localReadyRef = useRef(false);
  const localFailureRef = useRef(!localEnabled);
  const [status, setStatus] = useState<BrowserTtsStatus>(localEnabled ? "idle" : "error");
  const [isSpeaking, setIsSpeaking] = useState(false);

  const processSynthesisQueueRef = useRef<() => void>(() => {});
  const processPlaybackQueueRef = useRef<() => void>(() => {});

  useEffect(() => {
    if (!localEnabled) {
      localFailureRef.current = true;
      return;
    }

    const engine = ttsEngine ?? getSharedKokoroWorkerClient();
    engineRef.current = engine;
    localFailureRef.current = false;
    localReadyRef.current = false;
    const unsubscribe = engine.subscribe((nextStatus) => {
      if (nextStatus === "error") {
        localFailureRef.current = true;
        setStatus("error");
        return;
      }
      setStatus(nextStatus);
    });

    const preloadPromise = engine.preload();
    preloadPromiseRef.current = preloadPromise;
    void preloadPromise
      .then(() => {
        localReadyRef.current = true;
        setStatus("ready");
      })
      .catch(() => {
        localFailureRef.current = true;
        setStatus("error");
      });

    return () => {
      unsubscribe();
      if (ttsEngine) engine.dispose();
      if (engineRef.current === engine) engineRef.current = null;
      if (preloadPromiseRef.current === preloadPromise) preloadPromiseRef.current = null;
      localReadyRef.current = false;
    };
  }, [localEnabled, ttsEngine]);

  const cancel = useCallback(() => {
    generationRef.current += 1;
    textQueueRef.current = [];
    audioQueueRef.current = [];
    spokenPrefixRef.current = "";
    activeResponseRef.current = "";
    isSynthesizingRef.current = false;
    isPlayingRef.current = false;
    setIsSpeaking(false);
    engineRef.current?.cancel();
    if (currentSourceRef.current) {
      try {
        currentSourceRef.current.onended = null;
        currentSourceRef.current.stop();
      } catch {
        // already stopped — safe to ignore
      }
      currentSourceRef.current = null;
    }
  }, []);

  // 1. Playback Queue Consumer: Plays prepared AudioBuffers seamlessly back-to-back
  const processPlaybackQueue = useCallback(() => {
    if (typeof window === "undefined" || mutedRef.current || !enabled) return;
    if (isPlayingRef.current || currentSourceRef.current) return;

    const nextBuffer = audioQueueRef.current.shift();
    if (!nextBuffer) {
      isPlayingRef.current = false;
      if (!isSynthesizingRef.current && textQueueRef.current.length === 0) {
        setIsSpeaking(false);
      }
      return;
    }

    isPlayingRef.current = true;
    setIsSpeaking(true);
    const rate = getSpeechRate();
    const requestGeneration = generationRef.current;

    const ctx = getOrCreateAudioContext(audioContextRef);
    const source = ctx.createBufferSource();
    source.buffer = nextBuffer;
    source.playbackRate.value = rate;
    source.connect(ctx.destination);

    source.onended = () => {
      currentSourceRef.current = null;
      isPlayingRef.current = false;
      if (requestGeneration === generationRef.current) {
        processPlaybackQueueRef.current();
      }
    };

    currentSourceRef.current = source;
    source.start();
  }, [enabled]);

  // 2. Background Synthesis Pipeline: Continuously pre-synthesizes upcoming sentences
  const processSynthesisQueue = useCallback(async () => {
    if (typeof window === "undefined" || mutedRef.current || !enabled) return;
    if (isSynthesizingRef.current) return;

    if (!localEnabled || localFailureRef.current) {
      textQueueRef.current = [];
      setIsSpeaking(false);
      return;
    }

    const nextText = textQueueRef.current.shift();
    if (!nextText) return;

    isSynthesizingRef.current = true;
    const requestGeneration = generationRef.current;

    const engine = engineRef.current ?? getSharedKokoroWorkerClient();
    try {
      await engine.preload();
      const audio = await engine.synthesize(nextText, { persona: personaRef.current });
      
      if (requestGeneration === generationRef.current && !mutedRef.current) {
        const audioBuffer = createAudioBufferFromPcm(getOrCreateAudioContext(audioContextRef), audio);
        audioQueueRef.current.push(audioBuffer);
        
        // Start playback if not already playing
        processPlaybackQueueRef.current();
      }
    } catch (error) {
      if (requestGeneration === generationRef.current) {
        localFailureRef.current = true;
        setStatus("error");
        console.error("[TTS] Kokoro background synthesis error:", error);
        setIsSpeaking(false);
      }
    } finally {
      if (requestGeneration === generationRef.current) {
        isSynthesizingRef.current = false;
        // Immediately trigger synthesis of the next sentence in the queue (while current sentence plays)
        if (textQueueRef.current.length > 0) {
          processSynthesisQueueRef.current();
        }
      }
    }
  }, [enabled, localEnabled]);

  useEffect(() => {
    processPlaybackQueueRef.current = processPlaybackQueue;
  }, [processPlaybackQueue]);

  useEffect(() => {
    processSynthesisQueueRef.current = processSynthesisQueue;
  }, [processSynthesisQueue]);

  const queueSpeech = useCallback(
    (text: string) => {
      const cleaned = stripMarkdown(text);
      if (!cleaned) return;

      setIsSpeaking(true);

      for (const chunk of splitTtsText(cleaned)) {
        if (textQueueRef.current.length >= 3) {
          const lastIndex = textQueueRef.current.length - 1;
          textQueueRef.current[lastIndex] = mergePendingTtsText(textQueueRef.current[lastIndex], chunk);
        } else {
          textQueueRef.current.push(chunk);
        }
      }
      processSynthesisQueue();
    },
    [processSynthesisQueue]
  );

  const queueIncrementalSpeech = useCallback(
    (text: string, flushRemainder: boolean) => {
      if (typeof window === "undefined" || mutedRef.current || !enabled) return;

      const cleaned = stripMarkdown(text);
      if (!cleaned) return;

      if (!cleaned.startsWith(activeResponseRef.current)) {
        const nextPortion = cleaned.slice(spokenPrefixRef.current.length).trim();
        if (nextPortion) queueSpeech(nextPortion);
        activeResponseRef.current = cleaned;
        spokenPrefixRef.current = cleaned;
        return;
      }

      activeResponseRef.current = cleaned;

      const unsaid = cleaned.slice(spokenPrefixRef.current.length);
      if (!unsaid.trim()) return;

      if (flushRemainder) {
        spokenPrefixRef.current = cleaned;
        queueSpeech(unsaid);
        return;
      }

      const lastBoundary = Math.max(
        unsaid.lastIndexOf(". "),
        unsaid.lastIndexOf("! "),
        unsaid.lastIndexOf("? "),
        unsaid.lastIndexOf("\n")
      );

      if (lastBoundary === -1 && unsaid.length < STREAMING_SPEECH_MAX_CHARS) return;

      const splitAt = lastBoundary >= 0
        ? lastBoundary + 1
        : Math.max(unsaid.lastIndexOf(" ", STREAMING_SPEECH_MAX_CHARS), 1);
      const speakable = unsaid.slice(0, splitAt).trim();
      if (!speakable) return;

      spokenPrefixRef.current += unsaid.slice(0, splitAt);
      queueSpeech(speakable);
    },
    [enabled, queueSpeech]
  );

  const setMuted = useCallback(
    (value: boolean) => {
      mutedRef.current = value;
      setMutedState(value);
      localStorage.setItem(STORAGE_KEY, value ? "1" : "0");
      if (value) cancel();
    },
    [cancel]
  );

  const warmup = useCallback(() => {
    if (typeof window === "undefined" || !localEnabled) return;
    getOrCreateAudioContext(audioContextRef);
    const engine = engineRef.current ?? getSharedKokoroWorkerClient();
    void engine.preload().catch(() => {
      // The normal hook lifecycle records the failure for the pre-join UI.
    });
  }, [localEnabled]);

  useEffect(() => {
    if (!streamingText) return;
    queueIncrementalSpeech(streamingText, false);
  }, [queueIncrementalSpeech, streamingText]);

  useEffect(() => {
    if (!completedText) return;
    queueIncrementalSpeech(completedText, true);
  }, [completedText, queueIncrementalSpeech]);

  useEffect(() => {
    if (streamingText) return;
    activeResponseRef.current = "";
    spokenPrefixRef.current = "";
  }, [streamingText]);

  // Clean up audio resources on unmount
  useEffect(() => {
    return () => {
      textQueueRef.current = [];
      audioQueueRef.current = [];
      if (currentSourceRef.current) {
        try {
          currentSourceRef.current.onended = null;
          currentSourceRef.current.stop();
        } catch {
          // already stopped
        }
        currentSourceRef.current = null;
      }
      if (audioContextRef.current) {
        void audioContextRef.current.close();
        audioContextRef.current = null;
      }
      generationRef.current += 1;
      engineRef.current?.cancel();
    };
  }, []);

  return { muted, setMuted, cancel, warmup, status, isSpeaking };
}
