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
const SENTENCE_BOUNDARY = /[.?!]+(?=\s|$)/g;

function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/`{1,3}(.*?)`{1,3}/g, "$1")
    .replace(/#+\s/g, "")
    .trim();
}

function isSpeechAvailable(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

/**
 * Picks a random voice from an array. Returns undefined if the array is empty.
 */
function pickRandom<T>(arr: T[]): T | undefined {
  return arr.length > 0 ? arr[Math.floor(Math.random() * arr.length)] : undefined;
}

/**
 * Picks a random English voice. The persona character is expressed through the
 * AI's language, not the voice. Falls back to any available voice if no
 * English voice is found.
 */
function selectVoice(): SpeechSynthesisVoice | null {
  if (!isSpeechAvailable()) return null;
  const voices = window.speechSynthesis.getVoices();
  if (voices.length === 0) return null;

  const englishVoices = voices.filter((v) => v.lang.startsWith("en"));
  return pickRandom(englishVoices) ?? pickRandom(voices) ?? null;
}

export function useStreamingTTS({
  currentStreamedText,
  enabled = true,
  persona,
}: {
  currentStreamedText: string;
  enabled?: boolean;
  persona?: string | null;
}) {
  const [muted, setMutedState] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(STORAGE_KEY) === "1";
  });

  const mutedRef = useRef(muted);
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);
  // Tracks how many characters of the accumulated stream we've already queued for speech
  const spokenUpToRef = useRef(0);
  // Holds the last non-empty streamed text so we can flush the tail when the stream ends
  const lastTextRef = useRef("");

  // Resolve the persona voice once voices are available; re-run if persona changes
  useEffect(() => {
    if (!isSpeechAvailable()) return;

    function resolve() {
      voiceRef.current = selectVoice();
    }

    resolve();
    window.speechSynthesis.addEventListener("voiceschanged", resolve);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", resolve);
  }, [persona]);

  const speakSegment = useCallback((text: string) => {
    if (!isSpeechAvailable() || mutedRef.current || !enabled) return;
    const cleaned = stripMarkdown(text).trim();
    if (!cleaned) return;
    const utterance = new SpeechSynthesisUtterance(cleaned);
    utterance.rate = getSpeechRate();
    if (voiceRef.current) utterance.voice = voiceRef.current;
    try {
      window.speechSynthesis.speak(utterance);
    } catch {
      // Browser denied or speech synthesis is in a bad state — skip this segment
      // and let subsequent segments attempt normally.
    }
  }, [enabled]);

  const cancel = useCallback(() => {
    if (isSpeechAvailable()) window.speechSynthesis.cancel();
    spokenUpToRef.current = 0;
    lastTextRef.current = "";
  }, []);

  const setMuted = useCallback((value: boolean) => {
    mutedRef.current = value;
    setMutedState(value);
    localStorage.setItem(STORAGE_KEY, value ? "1" : "0");
    if (value) cancel();
  }, [cancel]);

  // React to each streaming update
  useEffect(() => {
    if (!isSpeechAvailable() || !enabled) return;

    if (currentStreamedText === "") {
      // Stream just ended — flush any tail that didn't end with punctuation
      if (lastTextRef.current) {
        const tail = lastTextRef.current.slice(spokenUpToRef.current);
        if (tail.trim()) speakSegment(tail);
      }
      spokenUpToRef.current = 0;
      lastTextRef.current = "";
      return;
    }

    lastTextRef.current = currentStreamedText;
    const newChunk = currentStreamedText.slice(spokenUpToRef.current);

    // Find all sentence-ending positions within the new chunk
    SENTENCE_BOUNDARY.lastIndex = 0;
    let match: RegExpExecArray | null;
    let lastEnd = 0;

    while ((match = SENTENCE_BOUNDARY.exec(newChunk)) !== null) {
      const end = match.index + match[0].length;
      const sentence = newChunk.slice(lastEnd, end);
      speakSegment(sentence);
      lastEnd = end;
    }

    spokenUpToRef.current += lastEnd;
  }, [currentStreamedText, enabled, speakSegment]);

  // Cancel on unmount
  useEffect(() => {
    return () => { if (isSpeechAvailable()) window.speechSynthesis.cancel(); };
  }, []);

  return { muted, setMuted, cancel };
}
