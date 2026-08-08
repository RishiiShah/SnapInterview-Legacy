import { describe, expect, it, vi } from "vitest";

import { normalizeOutput, runTestCases, SUPPORTED_LANGUAGES, type SupportedLanguage } from "./index";

const javascript = "javascript" as const;

describe("runTestCases", () => {
  it("only exposes the browser-validated JavaScript runner", () => {
    expect(SUPPORTED_LANGUAGES).toEqual([{ value: "javascript", label: "JavaScript" }]);
  });

  it("normalizes CRLF and one trailing newline without removing meaningful whitespace", () => {
    expect(normalizeOutput("answer\r\n")).toBe("answer");
    expect(normalizeOutput("answer\n\n")).toBe("answer\n");
    expect(normalizeOutput(" answer ")).toBe(" answer ");
  });

  it("runs public sample cases", async () => {
    const execute = vi.fn().mockResolvedValue({
      passed: false,
      stdout: "ok\n",
      stderr: "",
      executionTimeMs: 4,
    });

    const result = await runTestCases(
      "console.log('ok')",
      javascript,
      [
        { input: "visible", expectedOutput: "ok" },
        { input: "another sample", expectedOutput: "ok" },
      ],
      execute,
    );

    expect(execute).toHaveBeenCalledTimes(2);
    expect(execute).toHaveBeenCalledWith("console.log('ok')", javascript, "visible");
    expect(result).toMatchObject({ allPassed: true, results: [{ passed: true }, { passed: true }] });
  });

  it("does not accept an empty testcase list", async () => {
    const result = await runTestCases("", javascript, [], vi.fn());

    expect(result).toEqual({ results: [], allPassed: false });
  });

  it("marks worker errors as failed results", async () => {
    const result = await runTestCases(
      "throw new Error()",
      javascript,
      [{ input: "", expectedOutput: "" }],
      async () => ({ passed: false, stdout: "", stderr: "Worker error", executionTimeMs: 0 }),
    );

    expect(result.allPassed).toBe(false);
    expect(result.results[0]).toMatchObject({ passed: false, stderr: "Worker error" });
  });

  it("limits browser execution concurrency while preserving case order", async () => {
    let active = 0;
    let peak = 0;
    const execute = vi.fn(async (_code: string, _language: SupportedLanguage, input: string) => {
      active += 1;
      peak = Math.max(peak, active);
      await new Promise((resolve) => setTimeout(resolve, 5));
      active -= 1;
      return { passed: false, stdout: input, stderr: "", executionTimeMs: 5 };
    });

    const result = await runTestCases(
      "console.log(input)",
      javascript,
      Array.from({ length: 8 }, (_, ordinal) => ({
        input: String(ordinal),
        expectedOutput: String(ordinal),
      })),
      execute,
    );

    expect(peak).toBeLessThanOrEqual(3);
    expect(result.results.map((entry) => entry.input)).toEqual(["0", "1", "2", "3", "4", "5", "6", "7"]);
  });
});
