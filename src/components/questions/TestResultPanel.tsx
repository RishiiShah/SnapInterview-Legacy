"use client";

import type { RunResult } from "@/lib/code-runner";
import { IconSpinner } from "@/components/ui/icons";

export function TestResultPanel({
  runResult,
  isRunning,
}: {
  runResult: RunResult | null;
  isRunning: boolean;
}) {
  if (isRunning) {
    return (
      <div className="flex items-center justify-center gap-3 py-6 text-sm font-bold text-[#93C5FD]">
        <IconSpinner className="h-5 w-5 animate-spin" />
        Running test cases...
      </div>
    );
  }

  if (!runResult) {
    return <p className="py-4 text-center text-sm text-[#A8B0C2]">Run your code to see results.</p>;
  }

  const passed = runResult.results.filter((r) => r.passed).length;
  const total = runResult.results.length;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <span
          className={`text-sm font-bold ${
            runResult.allPassed ? "text-emerald-400" : "text-rose-400"
          }`}
        >
          {passed}/{total} passed
        </span>
        {runResult.allPassed && (
          <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-300">
            Accepted
          </span>
        )}
      </div>
      {runResult.results.map((r, i) => (
        <div
          key={i}
          className={`rounded-lg border px-3 py-2 text-xs ${
            r.passed
              ? "border-emerald-500/20 bg-emerald-500/10"
              : "border-rose-500/20 bg-rose-500/10"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`font-bold ${r.passed ? "text-emerald-300" : "text-rose-300"}`}>
              {r.passed ? "✓" : "✗"} Case {i + 1}
            </span>
            <span className="font-mono text-[#A8B0C2]">{r.executionTimeMs}ms</span>
          </div>
          {!r.passed && (
            <div className="mt-2 space-y-1">
              {r.stderr && (
                <div>
                  <p className="font-semibold text-rose-400">Error:</p>
                  <pre className="mt-0.5 whitespace-pre-wrap font-mono text-rose-300">{r.stderr}</pre>
                </div>
              )}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="font-semibold text-[#A8B0C2]">Expected:</p>
                  <pre className="mt-0.5 whitespace-pre-wrap font-mono text-[#E8ECF4]">{r.expectedOutput}</pre>
                </div>
                <div>
                  <p className="font-semibold text-[#A8B0C2]">Got:</p>
                  <pre className="mt-0.5 whitespace-pre-wrap font-mono text-[#E8ECF4]">{r.stdout || "(empty)"}</pre>
                </div>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
