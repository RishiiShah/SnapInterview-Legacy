export type SttWorkerStatus = "idle" | "loading" | "ready" | "error";

export type SttWorkerRequest =
  | { type: "preload"; requestId: string }
  | {
      type: "transcribe";
      requestId: string;
      generation: number;
      pcm: ArrayBuffer;
      sampleRate: number;
    }
  | { type: "cancel"; generation: number };

export type SttWorkerResponse =
  | { type: "ready"; requestId: string }
  | { type: "result"; requestId: string; generation: number; text: string }
  | { type: "error"; requestId?: string; message: string };
