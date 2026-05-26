export const WHISPER_SAMPLE_RATE = 16_000;
/** base.en: much better accuracy than tiny.en (~75MB first download). */
export const WHISPER_MODEL_ID = "Xenova/whisper-base.en";

/** Re-transcribe rolling window for live preview every N seconds of new audio. */
export const WHISPER_PARTIAL_INTERVAL_SEC = 5;
export const WHISPER_MAX_PARTIAL_WINDOW_SEC = 30;

export type SttWorkerRequest =
  | { type: "init" }
  | { type: "audio"; samples: Float32Array }
  | { type: "flush" }
  | { type: "reset" };

export type SttWorkerResponse =
  | { type: "ready" }
  | { type: "loading"; progress?: number }
  | { type: "partial"; text: string }
  | { type: "flushed"; text: string }
  | { type: "error"; message: string };
