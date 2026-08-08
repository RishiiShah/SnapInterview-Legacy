import type { MoonshineClient } from "./moonshine-worker-client";
import { initialSttState, type AudioRecorder, type SttEngine, type SttState } from "./stt-engine";

export const DEFAULT_TRANSCRIBE_INTERVAL_MS = 1_500;

const LOAD_ERROR =
  "Speech recognition model failed to load. Check your connection and try again.";

type LocalSttOptions = {
  createRecorder: () => AudioRecorder;
  client: MoonshineClient;
  intervalMs?: number;
};

/**
 * Local (Moonshine) STT engine. Emulates the streaming contract over a batch
 * model by re-transcribing the rolling capture buffer on a fixed interval (D2).
 */
export function createLocalSttEngine({
  createRecorder,
  client,
  intervalMs = DEFAULT_TRANSCRIBE_INTERVAL_MS,
}: LocalSttOptions): SttEngine {
  let state: SttState = { ...initialSttState };
  const listeners = new Set<(state: SttState) => void>();

  let recorder: AudioRecorder | null = null;
  let timer: ReturnType<typeof setInterval> | null = null;
  let running = false;
  let busy = false;

  const emit = (patch: Partial<SttState>) => {
    state = { ...state, ...patch };
    for (const listener of listeners) listener(state);
  };

  const clearTimer = () => {
    if (timer !== null) {
      clearInterval(timer);
      timer = null;
    }
  };

  const tick = () => {
    if (!running || busy || !recorder) return;
    const { pcm, sampleRate } = recorder.read();
    if (pcm.length === 0) return;
    busy = true;
    client
      .transcribe(pcm, sampleRate)
      .then((text) => {
        if (running) emit({ interimTranscript: text, error: null });
      })
      .catch(() => {
        // Mid-stream transcription errors/cancellations are non-fatal; keep going.
      })
      .finally(() => {
        busy = false;
      });
  };

  return {
    hasSupport: true,
    start() {
      if (running) return;
      running = true;
      emit({
        isRecording: true,
        finalTranscriptBlock: "",
        interimTranscript: "",
        volatileTranscript: "",
        error: null,
      });
      void (async () => {
        try {
          await client.preload();
          if (!running) return;
          recorder = createRecorder();
          await recorder.start();
          if (!running) return;
          timer = setInterval(tick, intervalMs);
        } catch (error) {
          running = false;
          console.error("Local STT failed to start", error);
          emit({ isRecording: false, error: LOAD_ERROR });
        }
      })();
    },
    stop() {
      if (!running) return;
      running = false;
      clearTimer();
      emit({ isRecording: false });

      const active = recorder;
      recorder = null;
      if (!active) return;
      active.stop();
      const { pcm, sampleRate } = active.read();
      client.cancel();
      if (pcm.length === 0) {
        active.dispose();
        return;
      }
      client
        .transcribe(pcm, sampleRate)
        .then((text) => {
          const finalStr = text.trim();
          if (finalStr) emit({ finalTranscriptBlock: finalStr, interimTranscript: finalStr });
        })
        .catch(() => {
          // Ignore final-flush failures; the interim text already shown stands.
        })
        .finally(() => {
          active.dispose();
        });
    },
    dispose() {
      running = false;
      clearTimer();
      recorder?.dispose();
      recorder = null;
      listeners.clear();
    },
    subscribe(listener) {
      listeners.add(listener);
      listener(state);
      return () => listeners.delete(listener);
    },
  };
}
