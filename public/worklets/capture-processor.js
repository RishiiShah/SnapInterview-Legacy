// AudioWorklet processor: forwards each mono input frame to the main thread.
// Served as a static file (script-src 'self') rather than a blob: URL, which
// script-src does not allow under the app CSP.
class CaptureProcessor extends AudioWorkletProcessor {
  process(inputs) {
    const channel = inputs[0] && inputs[0][0];
    if (channel && channel.length) this.port.postMessage(channel.slice());
    return true;
  }
}
registerProcessor("capture-processor", CaptureProcessor);
