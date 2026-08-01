"use client";

import type { RunResult } from "@/lib/code-runner";
import { IconSpinner } from "@/components/ui/icons";
import { parseTestCaseFields } from "@/components/questions/TestCasePanel";
import { cn } from "@/lib/utils";

export function TestResultPanel({
  runResult,
  isRunning,
}: {
  runResult: RunResult | null;
  isRunning: boolean;
}) {
  if (isRunning) {
    return (
      <div className="flex items-center justify-center gap-3 py-10 text-sm font-medium text-[#93C5FD]">
        <IconSpinner className="h-5 w-5 animate-spin" />
        Running test cases...
      </div>
    );
  }

  if (!runResult) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 px-6 py-12 text-center">
        <p className="text-sm text-[#A8B0C2]">You must run your code first</p>
        <p className="text-xs text-[#6B7385]">
          Click Run to execute against the sample testcases.
        </p>
      </div>
    );
  }

  const passed = runResult.results.filter((r) => r.passed).length;
  const total = runResult.results.length;

  return (
    <div className="space-y-4 px-4 py-3">
      <div className="flex items-center gap-2.5">
        <span
          className={cn(
            "text-sm font-semibold",
            runResult.allPassed ? "text-emerald-400" : "text-rose-400",
          )}
        >
          {runResult.allPassed ? "Accepted" : "Wrong Answer"}
        </span>
        <span className="text-xs text-[#A8B0C2]">
          {passed}/{total} testcases passed
        </span>
      </div>

      {runResult.results.map((r, i) => {
        const fields = parseTestCaseFields(r.input);

        return (
          <div
            key={i}
            className={cn(
              "rounded-lg px-3.5 py-3",
              r.passed ? "bg-emerald-500/[0.08]" : "bg-rose-500/[0.08]",
            )}
          >
            <div className="mb-2 flex items-center justify-between">
              <span
                className={cn(
                  "text-[13px] font-semibold",
                  r.passed ? "text-emerald-300" : "text-rose-300",
                )}
              >
                {r.passed ? "✓" : "✗"} Case {i + 1}
              </span>
              <span className="font-mono text-[11px] text-[#A8B0C2]">{r.executionTimeMs}ms</span>
            </div>

            {fields.length > 0 ? (
              <div className="mb-2 space-y-1 font-mono text-xs text-[#C5CBD8]">
                {fields.map((f) => (
                  <div key={f.name}>
                    <span className="text-[#A8B0C2]">{f.name} =</span> {f.value}
                  </div>
                ))}
              </div>
            ) : null}

            {!r.passed ? (
              <div className="space-y-2 text-xs">
                {r.stderr ? (
                  <pre className="whitespace-pre-wrap font-mono text-rose-300">{r.stderr}</pre>
                ) : null}
                <div>
                  <p className="mb-1 text-[#A8B0C2]">
                    Output:{" "}
                    <span className="font-mono text-[#E8ECF4]">{r.stdout || "(empty)"}</span>
                  </p>
                  <p className="text-[#A8B0C2]">
                    Expected:{" "}
                    <span className="font-mono text-[#E8ECF4]">{r.expectedOutput}</span>
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
