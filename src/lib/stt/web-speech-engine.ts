import { initialSttState, type SttEngine, type SttState } from "./stt-engine";

type RecognitionAlternative = { transcript: string };
type RecognitionResult = { isFinal: boolean; [index: number]: RecognitionAlternative };
type RecognitionResultList = { length: number; [index: number]: RecognitionResult };
type RecognitionEvent = { resultIndex: number; results: RecognitionResultList };
type RecognitionErrorEvent = { error?: string };

export type RecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: RecognitionEvent) => void) | null;
  onerror: ((event: RecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type RecognitionFactory = () => RecognitionLike | null;

const UNSUPPORTED_MESSAGE =
  "Speech recognition is unavailable in this browser. Use Chrome or Edge for voice answers.";

function getSpeechErrorMessage(errorCode?: string): string {
  switch (errorCode) {
    case "network":
      return "Speech recognition network error. In Brave, disable Shields for this site and allow microphone access, then retry.";
    case "not-allowed":
    case "service-not-allowed":
      return "Microphone or speech service permission was denied. Please allow access and try again.";
    case "audio-capture":
      return "No microphone input detected. Check your selected microphone and browser permissions.";
    case "no-speech":
      return "No speech was detected. Please speak clearly and try again.";
    case "language-not-supported":
      return "Selected speech language is not supported in this browser.";
    default:
      return UNSUPPORTED_MESSAGE;
  }
}

function defaultFactory(): RecognitionLike | null {
  if (typeof window === "undefined") return null;
  const w = window as typeof window & {
    SpeechRecognition?: new () => RecognitionLike;
    webkitSpeechRecognition?: new () => RecognitionLike;
  };
  const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
  return Ctor ? new Ctor() : null;
}

export function createWebSpeechEngine(
  createRecognition: RecognitionFactory = defaultFactory,
): SttEngine {
  const recognition = createRecognition();
  const hasSupport = recognition !== null;

  let state: SttState = {
    ...initialSttState,
    error: hasSupport ? null : UNSUPPORTED_MESSAGE,
  };
  const listeners = new Set<(state: SttState) => void>();

  let fullTranscript = "";
  let intentional = false;
  let userStopped = false;
  let active = false;

  const emit = (patch: Partial<SttState>) => {
    state = { ...state, ...patch };
    for (const listener of listeners) listener(state);
  };

  if (recognition) {
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event) => {
      let currentInterim = "";
      let currentFinal = "";
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          currentFinal += event.results[i][0].transcript;
        } else {
          currentInterim += event.results[i][0].transcript;
        }
      }

      if (currentFinal) {
        const prev = fullTranscript;
        const sep =
          prev.endsWith(" ") || currentFinal.startsWith(" ") || prev === "" ? "" : " ";
        fullTranscript = prev + sep + currentFinal;
      }
      emit({
        error: null,
        interimTranscript: fullTranscript,
        volatileTranscript: currentInterim,
      });
    };

    recognition.onerror = (event) => {
      const errorCode = event?.error;
      console.error("Speech recognition error", errorCode);
      if (errorCode === "no-speech") return;
      intentional = false;
      active = false;
      emit({ error: getSpeechErrorMessage(errorCode), isRecording: false });
    };

    recognition.onend = () => {
      if (intentional && !userStopped) {
        try {
          recognition.start();
          active = true;
          return;
        } catch (err) {
          console.error("Auto-restart failed:", err);
        }
      }

      const shouldPublish = userStopped || intentional;
      intentional = false;
      userStopped = false;
      active = false;

      const finalStr = shouldPublish ? fullTranscript.trim() : "";
      fullTranscript = "";
      emit({
        isRecording: false,
        interimTranscript: "",
        volatileTranscript: "",
        ...(finalStr ? { finalTranscriptBlock: finalStr } : {}),
      });
    };
  }

  return {
    hasSupport,
    start() {
      if (!recognition) {
        emit({ error: UNSUPPORTED_MESSAGE });
        return;
      }
      if (active || state.isRecording) return;
      fullTranscript = "";
      intentional = true;
      emit({
        finalTranscriptBlock: "",
        interimTranscript: "",
        volatileTranscript: "",
        error: null,
        isRecording: true,
      });
      try {
        recognition.start();
        active = true;
      } catch (e) {
        console.error("Failed to start recognition", e);
        intentional = false;
        active = false;
        emit({
          error: "Unable to start speech recognition. Please retry or switch to Chrome/Edge.",
          isRecording: false,
        });
      }
    },
    stop() {
      if (!recognition || !active) return;
      const pending = fullTranscript;
      userStopped = true;
      try {
        recognition.stop();
      } catch (e) {
        console.error("Failed to stop recognition", e);
        intentional = false;
        userStopped = false;
        active = false;
        const finalStr = pending.trim();
        fullTranscript = "";
        emit({
          isRecording: false,
          interimTranscript: "",
          volatileTranscript: "",
          ...(finalStr ? { finalTranscriptBlock: finalStr } : {}),
        });
      }
    },
    dispose() {
      if (recognition) {
        recognition.onend = null;
        try {
          recognition.stop();
        } catch {
          // Ignore stop errors during teardown when recognition is already inactive.
        }
      }
      listeners.clear();
    },
    subscribe(listener) {
      listeners.add(listener);
      listener(state);
      return () => listeners.delete(listener);
    },
  };
}
