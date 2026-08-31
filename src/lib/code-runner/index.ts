import type { ExecutionResult, TestCaseResult, RunResult } from "./types";
import { runJavaScript } from "./javascript-runner";

export type { ExecutionResult, TestCaseResult, RunResult };

export type ExecuteCode = (
  code: string,
  input: string,
) => Promise<ExecutionResult>;

const MAX_CONCURRENT_TESTS = 3;

export function normalizeOutput(output: string): string {
  return output.replace(/\r\n/g, "\n").replace(/\n$/, "");
}

export async function runTestCases(
  code: string,
  testCases: Array<{ input: string; expectedOutput: string }>,
  execute: ExecuteCode = runJavaScript,
): Promise<RunResult> {
  const results = new Array<TestCaseResult>(testCases.length);
  let nextIndex = 0;
  const worker = async () => {
    while (true) {
      const index = nextIndex;
      nextIndex += 1;
      const testCase = testCases[index];
      if (!testCase) return;

      const result = await execute(code, testCase.input);
      results[index] = {
        ...result,
        passed:
          result.stderr === "" &&
          normalizeOutput(result.stdout) === normalizeOutput(testCase.expectedOutput),
        input: testCase.input,
        expectedOutput: testCase.expectedOutput,
      };
    }
  };

  await Promise.all(Array.from({ length: Math.min(MAX_CONCURRENT_TESTS, testCases.length) }, worker));

  return {
    results,
    allPassed: results.length > 0 && results.every((r) => r.passed),
  };
}
