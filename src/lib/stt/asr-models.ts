export type AsrModelKind = "moonshine" | "whisper";

export const MOONSHINE_MODEL_ID = "onnx-community/moonshine-base-ONNX";
// Fallback used only if Moonshine fails to load. Exact id / quantization size
// (~60MB target) is confirmable at first browser load; swap here if needed.
export const WHISPER_MODEL_ID = "onnx-community/whisper-base";

export type AsrLoadAttempt = {
  kind: AsrModelKind;
  modelId: string;
  device: "webgpu" | "wasm";
  dtype: "fp32" | "q8";
};

/**
 * Ordered model-load attempts. Moonshine (primary) is tried on every device
 * before Whisper (fallback) — so Whisper only loads if every Moonshine attempt
 * failed. GPU is preferred over WASM when WebGPU is available.
 */
export function buildAsrLoadPlan(hasGpu: boolean): AsrLoadAttempt[] {
  const devices: Array<{ device: "webgpu" | "wasm"; dtype: "fp32" | "q8" }> = [];
  if (hasGpu) devices.push({ device: "webgpu", dtype: "fp32" });
  devices.push({ device: "wasm", dtype: "q8" });

  const models: Array<{ kind: AsrModelKind; modelId: string }> = [
    { kind: "moonshine", modelId: MOONSHINE_MODEL_ID },
    { kind: "whisper", modelId: WHISPER_MODEL_ID },
  ];

  return models.flatMap(({ kind, modelId }) =>
    devices.map((d) => ({ kind, modelId, ...d })),
  );
}

/** Per-model pipeline call options. Whisper needs language/task + long-form chunking. */
export function transcribeOptionsFor(kind: AsrModelKind): Record<string, unknown> {
  return kind === "whisper"
    ? { language: "en", task: "transcribe", chunk_length_s: 30, stride_length_s: 5 }
    : {};
}
