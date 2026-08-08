/** Snapshot of transcription state emitted to subscribers on every change. */
export type SttState = {
  isRecording: boolean;
  /** Accumulated finalized text for the current session. */
  interimTranscript: string;
  /** Current not-yet-finalized text. */
  volatileTranscript: string;
  /** Published once when recording stops; cleared on the next start. */
  finalTranscriptBlock: string;
  error: string | null;
};

export type SttEngine = {
  readonly hasSupport: boolean;
  start: () => void;
  stop: () => void;
  dispose: () => void;
  /** Returns the current snapshot immediately, then on every change. */
  subscribe: (listener: (state: SttState) => void) => () => void;
};

/** Captures mono microphone PCM into a growing buffer read on demand. */
export type AudioRecorder = {
  start: () => Promise<void>;
  stop: () => void;
  /** All PCM captured since start(), plus the capture sample rate. */
  read: () => { pcm: Float32Array; sampleRate: number };
  dispose: () => void;
};

export const initialSttState: SttState = {
  isRecording: false,
  interimTranscript: "",
  volatileTranscript: "",
  finalTranscriptBlock: "",
  error: null,
};
