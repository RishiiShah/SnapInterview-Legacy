import type { AudioRecorder } from "./stt-engine";

// AudioWorklet processor is served as a static file (script-src 'self'); a
// blob: URL would be blocked because the app CSP's script-src omits blob:.
const PROCESSOR_URL = "/worklets/capture-processor.js";

/**
 * Microphone recorder that accumulates raw mono PCM. The engine reads the whole
 * rolling buffer each tick; downsampling to 16 kHz happens in the worker.
 */
export function createMicRecorder(deviceId?: string): AudioRecorder {
  let stream: MediaStream | null = null;
  let context: AudioContext | null = null;
  let source: MediaStreamAudioSourceNode | null = null;
  let node: AudioWorkletNode | null = null;

  // ponytail: worklet posts one message per 128-sample frame (~375/s at 48kHz).
  // Fine for interview-length answers; batch frames in the worklet if it ever
  // shows up as main-thread pressure.
  let chunks: Float32Array[] = [];
  let totalLength = 0;
  let sampleRate = 16_000;

  return {
    async start() {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: deviceId ? { exact: deviceId } : undefined,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      context = new AudioContext();
      sampleRate = context.sampleRate;

      await context.audioWorklet.addModule(PROCESSOR_URL);

      source = context.createMediaStreamSource(stream);
      node = new AudioWorkletNode(context, "capture-processor");
      node.port.onmessage = (event: MessageEvent<Float32Array>) => {
        chunks.push(event.data);
        totalLength += event.data.length;
      };
      source.connect(node);
      // Not connected to destination — we don't want to play the mic back.
    },
    stop() {
      node?.port.close();
      node?.disconnect();
      source?.disconnect();
      stream?.getTracks().forEach((track) => track.stop());
      node = null;
      source = null;
      stream = null;
    },
    read() {
      const pcm = new Float32Array(totalLength);
      let offset = 0;
      for (const chunk of chunks) {
        pcm.set(chunk, offset);
        offset += chunk.length;
      }
      return { pcm, sampleRate };
    },
    dispose() {
      this.stop();
      void context?.close();
      context = null;
      chunks = [];
      totalLength = 0;
    },
  };
}
