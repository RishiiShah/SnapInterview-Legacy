import type { ExecutionResult } from "./types";

const TIMEOUT_MS = 10000;

export function runPython(code: string, input: string): Promise<ExecutionResult> {
  return new Promise((resolve) => {
    const worker = new Worker("/workers/python-worker.js");

    const timer = setTimeout(() => {
      worker.terminate();
      resolve({
        passed: false,
        stdout: "",
        stderr: "Time Limit Exceeded (10s)",
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
