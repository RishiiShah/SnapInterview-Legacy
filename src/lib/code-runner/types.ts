export type ExecutionResult = {
  passed: boolean;
  stdout: string;
  stderr: string;
  executionTimeMs: number;
};

export type TestCaseResult = ExecutionResult & {
  input: string;
  expectedOutput: string;
};

export type RunResult = {
  results: TestCaseResult[];
  allPassed: boolean;
};
