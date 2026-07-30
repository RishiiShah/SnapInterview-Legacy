import { describe, expect, it } from "vitest";
import { downsampleTo16kHz } from "./downsample";

describe("downsampleTo16kHz", () => {
  it("returns a copy when already at 16 kHz", () => {
    const input = new Float32Array([0.1, 0.2, 0.3]);
    const output = downsampleTo16kHz(input, 16_000);
    expect(output).not.toBe(input);
    expect(output.length).toBe(input.length);
  });

  it("downsamples 48 kHz audio to 16 kHz", () => {
    const input = new Float32Array(48_000).map((_, index) => Math.sin(index / 100));
    const output = downsampleTo16kHz(input, 48_000);
    expect(output.length).toBe(16_000);
  });
});
