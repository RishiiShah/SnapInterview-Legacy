"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

const STORAGE_KEY = "tts_muted";
const SPEED_STORAGE_KEY = "tts_speed";

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
}: {
  streamingText?: string;
  completedText: string;
  enabled?: boolean;
  persona?: string | null;
}) {
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
  const queueRef = useRef<string[]>([]);
  const spokenPrefixRef = useRef("");
  const activeResponseRef = useRef("");
  const speakNextRef = useRef<() => void>(() => {});
  const isSpeakingRef = useRef(false);

  const cancel = useCallback(() => {
    queueRef.current = [];
    spokenPrefixRef.current = "";
    activeResponseRef.current = "";
    isSpeakingRef.current = false;
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

  const speakNext = useCallback(() => {
    if (typeof window === "undefined" || mutedRef.current || !enabled) return;
    if (isSpeakingRef.current || currentSourceRef.current) return; // already fetching or playing

    const nextText = queueRef.current.shift();
    if (!nextText) return;

    isSpeakingRef.current = true;
    const rate = getSpeechRate();

    fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: nextText, persona: personaRef.current }),
    })
      .then(async (res) => {
        if (!res.ok) {
          const detail = await res.text().catch(() => "");
          throw new Error(`TTS API ${res.status}: ${detail}`);
        }
        return res.arrayBuffer();
      })
      .then((arrayBuffer) => {
        const ctx = getOrCreateAudioContext(audioContextRef);
        return ctx.decodeAudioData(arrayBuffer).then((audioBuffer) => {
          if (mutedRef.current) return; // cancelled while decoding

          const source = ctx.createBufferSource();
          source.buffer = audioBuffer;
          source.playbackRate.value = rate;
          source.connect(ctx.destination);
          source.onended = () => {
            currentSourceRef.current = null;
            isSpeakingRef.current = false;
            speakNextRef.current();
          };
          currentSourceRef.current = source;
          source.start();
        });
      })
      .catch((err) => {
        console.error("[TTS] playback error:", err);
        currentSourceRef.current = null;
        isSpeakingRef.current = false;
        speakNextRef.current(); // skip failed sentence, continue queue
      });
  }, [enabled]);

  useEffect(() => {
    speakNextRef.current = speakNext;
  }, [speakNext]);

  const queueSpeech = useCallback(
    (text: string) => {
      const cleaned = stripMarkdown(text);
      if (!cleaned) return;
      queueRef.current.push(cleaned);
      speakNext();
    },
    [speakNext]
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

      if (lastBoundary === -1) return;

      const speakable = unsaid.slice(0, lastBoundary + 1).trim();
      if (!speakable) return;

      spokenPrefixRef.current += unsaid.slice(0, lastBoundary + 1);
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
      queueRef.current = [];
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
    };
  }, []);

  return { muted, setMuted, cancel };
}
