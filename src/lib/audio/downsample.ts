/**
 * Linear-interpolation downsampling to 16 kHz (Whisper input rate).
 */
export function downsampleTo16kHz(
  buffer: Float32Array,
  inputSampleRate: number,
  targetSampleRate = 16_000
): Float32Array {
  if (inputSampleRate === targetSampleRate) {
    return buffer.slice();
  }
  if (inputSampleRate < targetSampleRate) {
    return buffer.slice();
  }

  const ratio = inputSampleRate / targetSampleRate;
  const outputLength = Math.max(1, Math.round(buffer.length / ratio));
  const output = new Float32Array(outputLength);

  for (let i = 0; i < outputLength; i++) {
    const position = i * ratio;
    const index = Math.floor(position);
    const fraction = position - index;
    const sampleA = buffer[index] ?? 0;
    const sampleB = buffer[index + 1] ?? sampleA;
    output[i] = sampleA * (1 - fraction) + sampleB * fraction;
  }

  return output;
}
