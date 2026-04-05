"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const STORAGE_KEY = "tts_muted";
const SPEED_STORAGE_KEY = "tts_speed";

const SPEECH_RATES: Record<string, number> = {
  slow: 0.85,
  normal: 1.05,
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

function isSpeechAvailable(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}


// Preferred voice names ordered by quality — first match wins
const PREFERRED_VOICE_NAMES = [
  "Samantha",       // macOS high-quality
  "Alex",           // macOS high-quality
  "Google US English",
  "Google UK English Female",
  "Microsoft Zira",
  "Microsoft David",
  "Karen",          // macOS Australian English (natural)
  "Daniel",         // macOS British English (natural)
];

function selectVoice(): SpeechSynthesisVoice | null {
  if (!isSpeechAvailable()) return null;
  const voices = window.speechSynthesis.getVoices();
  if (voices.length === 0) return null;

  const englishVoices = voices.filter((v) => v.lang.startsWith("en"));

  // 1. Prefer a known high-quality named voice
  for (const name of PREFERRED_VOICE_NAMES) {
    const match = englishVoices.find((v) => v.name.includes(name));
    if (match) return match;
  }

  // 2. Prefer the browser default English voice
  const defaultEnglish = englishVoices.find((v) => v.default);
  if (defaultEnglish) return defaultEnglish;

  // 3. Prefer a local (on-device) English voice over a remote one
  const localEnglish = englishVoices.find((v) => v.localService);
  if (localEnglish) return localEnglish;

  // 4. Any English voice, then any voice
  return englishVoices[0] ?? voices[0] ?? null;
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
  const [muted, setMutedState] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(STORAGE_KEY) === "1";
  });

  const mutedRef = useRef(muted);
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const queueRef = useRef<string[]>([]);
  const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const spokenPrefixRef = useRef("");
  const activeResponseRef = useRef("");
  const speakNextRef = useRef<() => void>(() => {});

  useEffect(() => {
    if (!isSpeechAvailable()) return;

    function resolve() {
      voiceRef.current = selectVoice();
    }

    resolve();
    window.speechSynthesis.addEventListener("voiceschanged", resolve);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", resolve);
  }, [persona]);

  const cancel = useCallback(() => {
    queueRef.current = [];
    spokenPrefixRef.current = "";
    activeResponseRef.current = "";
    currentUtteranceRef.current = null;
    if (isSpeechAvailable()) window.speechSynthesis.cancel();
  }, []);

  const speakNext = useCallback(() => {
    if (!isSpeechAvailable() || mutedRef.current || !enabled) return;
    if (currentUtteranceRef.current) return;

    const nextText = queueRef.current.shift();
    if (!nextText) return;

    const utterance = new SpeechSynthesisUtterance(nextText);
    utterance.rate = getSpeechRate();
    if (voiceRef.current) utterance.voice = voiceRef.current;
    utterance.onend = () => {
      currentUtteranceRef.current = null;
      speakNextRef.current();
    };
    utterance.onerror = () => {
      currentUtteranceRef.current = null;
      speakNextRef.current();
    };

    currentUtteranceRef.current = utterance;
    try {
      window.speechSynthesis.speak(utterance);
    } catch {
      currentUtteranceRef.current = null;
    }
  }, [enabled]);

  useEffect(() => {
    speakNextRef.current = speakNext;
  }, [speakNext]);

  const queueSpeech = useCallback((text: string) => {
    const cleaned = stripMarkdown(text);
    if (!cleaned) return;
    queueRef.current.push(cleaned);
    speakNext();
  }, [speakNext]);

  const queueIncrementalSpeech = useCallback((text: string, flushRemainder: boolean) => {
    if (!isSpeechAvailable() || mutedRef.current || !enabled) return;

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
  }, [enabled, queueSpeech]);

  const setMuted = useCallback((value: boolean) => {
    mutedRef.current = value;
    setMutedState(value);
    localStorage.setItem(STORAGE_KEY, value ? "1" : "0");
    if (value) cancel();
  }, [cancel]);

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

  // Cancel on unmount
  useEffect(() => {
    return () => {
      queueRef.current = [];
      currentUtteranceRef.current = null;
      if (isSpeechAvailable()) window.speechSynthesis.cancel();
    };
  }, []);

  return { muted, setMuted, cancel };
}
