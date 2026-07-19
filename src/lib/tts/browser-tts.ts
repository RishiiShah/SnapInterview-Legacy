export type BrowserTtsStatus = "idle" | "loading" | "ready" | "fallback" | "error";

export type BrowserTtsAudio = {
  pcm: Float32Array;
  sampleRate: number;
};

export type BrowserTtsEngine = {
  preload: () => Promise<void>;
  synthesize: (text: string, options?: { persona?: string | null }) => Promise<BrowserTtsAudio>;
  cancel: () => void;
  dispose: () => void;
  subscribe: (listener: (status: BrowserTtsStatus) => void) => () => void;
};

export const MAX_PENDING_TTS_CHARS = 6_000;
export const MAX_TTS_UTTERANCE_CHARS = 1_000;

const PERSONA_VOICES: Record<string, string> = {
  friendly: "af_bella",
  balanced: "af_sarah",
  strict: "am_michael",
};

export function resolveKokoroVoice(persona?: string | null): string {
  return PERSONA_VOICES[persona?.toLowerCase() ?? ""] ?? PERSONA_VOICES.balanced;
}

export function limitTtsText(text: string): string {
  return text.length <= MAX_PENDING_TTS_CHARS
    ? text
    : text.slice(0, MAX_PENDING_TTS_CHARS).trimEnd();
}

export function splitTtsText(text: string, maxChars = MAX_TTS_UTTERANCE_CHARS): string[] {
  const chunks: string[] = [];
  let remaining = text.trim();
  const limit = Math.max(1, maxChars);

  while (remaining.length > limit) {
    const boundary = Math.max(
      remaining.lastIndexOf(". ", limit),
      remaining.lastIndexOf("! ", limit),
      remaining.lastIndexOf("? ", limit),
      remaining.lastIndexOf("\n", limit),
    );
    const whitespace = remaining.lastIndexOf(" ", limit);
    const cutAt = boundary >= 0 ? boundary + 1 : whitespace > 0 ? whitespace : limit;
    chunks.push(remaining.slice(0, cutAt).trim());
    remaining = remaining.slice(cutAt).trimStart();
  }

  if (remaining) chunks.push(remaining);
  return chunks;
}

export function mergePendingTtsText(existing: string, incoming: string): string {
  const merged = `${limitTtsText(existing)} ${limitTtsText(incoming)}`.trim();
  if (merged.length <= MAX_PENDING_TTS_CHARS) return merged;
  return merged.slice(-MAX_PENDING_TTS_CHARS).trimStart();
}

export function isLocalTtsEnabled(value = getPublicLocalTtsFlag()): boolean {
  return value !== "false";
}

function getPublicLocalTtsFlag(): string | undefined {
  if (typeof process === "undefined") return undefined;
  return process.env.NEXT_PUBLIC_LOCAL_TTS_ENABLED;
}

export function createAudioBufferFromPcm(
  audioContext: AudioContext,
  audio: BrowserTtsAudio,
): AudioBuffer {
  const buffer = audioContext.createBuffer(1, audio.pcm.length, audio.sampleRate);
  buffer.copyToChannel(audio.pcm as unknown as Float32Array<ArrayBuffer>, 0);
  return buffer;
}
