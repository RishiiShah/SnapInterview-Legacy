import type { ExecutionResult } from "./types";

const TIMEOUT_MS = 5000;

export function runJavaScript(code: string, input: string): Promise<ExecutionResult> {
  return new Promise((resolve) => {
    const worker = new Worker("/workers/js-worker.js");

    const timer = setTimeout(() => {
      worker.terminate();
      resolve({
        passed: false,
        stdout: "",
        stderr: "Time Limit Exceeded (5s)",
        executionTimeMs: TIMEOUT_MS,
      });
    }, TIMEOUT_MS);

    worker.onmessage = (e) => {
      clearTimeout(timer);
      worker.terminate();
      resolve({
        passed: false,
        stdout: e.data.stdout,
        stderr: e.data.stderr,
        executionTimeMs: e.data.executionTimeMs,
      });
    };

    worker.onerror = (err) => {
      clearTimeout(timer);
      worker.terminate();
      resolve({
        passed: false,
        stdout: "",
        stderr: err.message || "Worker error",
        executionTimeMs: 0,
      });
    };

    worker.postMessage({ code, input });
  });
}
