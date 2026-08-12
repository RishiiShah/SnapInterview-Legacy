import { describe, expect, it } from "vitest";
import {
  buildAsrLoadPlan,
  transcribeOptionsFor,
  MOONSHINE_MODEL_ID,
  WHISPER_MODEL_ID,
} from "./asr-models";

describe("buildAsrLoadPlan", () => {
  it("tries Moonshine before Whisper, GPU before WASM", () => {
    const plan = buildAsrLoadPlan(true);
    expect(plan.map((a) => `${a.kind}:${a.device}`)).toEqual([
      "moonshine:webgpu",
      "moonshine:wasm",
      "whisper:webgpu",
      "whisper:wasm",
    ]);
    expect(plan[0].modelId).toBe(MOONSHINE_MODEL_ID);
    expect(plan[2].modelId).toBe(WHISPER_MODEL_ID);
  });

  it("omits the GPU attempts when there is no WebGPU", () => {
    const plan = buildAsrLoadPlan(false);
    expect(plan.map((a) => `${a.kind}:${a.device}`)).toEqual([
      "moonshine:wasm",
      "whisper:wasm",
    ]);
  });

  it("keeps Whisper strictly after all Moonshine attempts (fallback order)", () => {
    const plan = buildAsrLoadPlan(true);
    const lastMoonshine = plan.map((a) => a.kind).lastIndexOf("moonshine");
    const firstWhisper = plan.map((a) => a.kind).indexOf("whisper");
    expect(firstWhisper).toBeGreaterThan(lastMoonshine);
  });
});

describe("transcribeOptionsFor", () => {
  it("passes English long-form options for Whisper", () => {
    expect(transcribeOptionsFor("whisper")).toMatchObject({ language: "en", task: "transcribe" });
  });

  it("passes no extra options for Moonshine", () => {
    expect(transcribeOptionsFor("moonshine")).toEqual({});
  });
});
