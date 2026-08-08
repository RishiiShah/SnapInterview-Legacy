export type SttEngineChoice = "web-speech" | "local" | "none";

type SpeechWindowLike = {
  SpeechRecognition?: unknown;
  webkitSpeechRecognition?: unknown;
};

export function hasWebSpeechSupport(
  win: SpeechWindowLike | undefined = typeof window !== "undefined"
    ? (window as SpeechWindowLike)
    : undefined,
): boolean {
  if (!win) return false;
  return Boolean(win.SpeechRecognition || win.webkitSpeechRecognition);
}

export function isLocalSttEnabled(value = getPublicLocalSttFlag()): boolean {
  return value !== "false";
}

function getPublicLocalSttFlag(): string | undefined {
  if (typeof process === "undefined") return undefined;
  return process.env.NEXT_PUBLIC_LOCAL_STT_ENABLED;
}

export function selectSttEngine(
  args: { hasWebSpeech?: boolean; localEnabled?: boolean } = {},
): SttEngineChoice {
  const hasWebSpeech = args.hasWebSpeech ?? hasWebSpeechSupport();
  const localEnabled = args.localEnabled ?? isLocalSttEnabled();

  if (hasWebSpeech) return "web-speech";
  if (localEnabled) return "local";
  return "none";
}
