import type { ExecutionResult, TestCaseResult, RunResult } from "./types";
import { runJavaScript } from "./javascript-runner";
import { runPython } from "./python-runner";
import { runCpp } from "./cpp-runner";

export type { ExecutionResult, TestCaseResult, RunResult };
export type SupportedLanguage = "javascript" | "python" | "cpp";

export const SUPPORTED_LANGUAGES: { value: SupportedLanguage; label: string }[] = [
  { value: "javascript", label: "JavaScript" },
  { value: "python", label: "Python" },
  { value: "cpp", label: "C++" },
];

async function executeCode(
  code: string,
  language: SupportedLanguage,
  input: string,
): Promise<ExecutionResult> {
  switch (language) {
    case "javascript":
      return runJavaScript(code, input);
    case "python":
      return runPython(code, input);
    case "cpp":
      return runCpp(code, input);
  }
}

export async function runTestCases(
  code: string,
  language: SupportedLanguage,
  testCases: Array<{ input: string; expectedOutput: string; isHidden: boolean }>,
  visibleOnly: boolean,
): Promise<RunResult> {
  const cases = visibleOnly ? testCases.filter((tc) => !tc.isHidden) : testCases;
  const results: TestCaseResult[] = [];

  for (const tc of cases) {
    const result = await executeCode(code, language, tc.input);
    results.push({
      ...result,
      passed: result.stderr === "" && result.stdout.trim() === tc.expectedOutput.trim(),
      input: tc.input,
      expectedOutput: tc.expectedOutput,
    });
  }

  return {
    results,
    allPassed: results.every((r) => r.passed),
  };
}
