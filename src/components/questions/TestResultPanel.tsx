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
      <div className="flex items-center justify-center gap-3 py-6 text-sm text-sky-600 font-bold">
        <IconSpinner className="h-5 w-5 animate-spin" />
        Running test cases...
      </div>
    );
  }

  if (!runResult) {
    return <p className="py-4 text-center text-sm text-zinc-500">Run your code to see results.</p>;
  }

  const passed = runResult.results.filter((r) => r.passed).length;
  const total = runResult.results.length;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <span
          className={`text-sm font-bold ${
            runResult.allPassed ? "text-emerald-600" : "text-red-600"
          }`}
        >
          {passed}/{total} passed
        </span>
        {runResult.allPassed && (
          <span className="rounded-full bg-emerald-50 border border-emerald-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
            Accepted
          </span>
        )}
      </div>
      {runResult.results.map((r, i) => (
        <div
          key={i}
          className={`rounded-lg border px-3 py-2 text-xs ${
            r.passed
              ? "border-emerald-100 bg-emerald-50/50"
              : "border-red-100 bg-red-50/50"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="font-bold">
              {r.passed ? "✓" : "✗"} Case {i + 1}
            </span>
            <span className="text-zinc-400 font-mono">{r.executionTimeMs}ms</span>
          </div>
          {!r.passed && (
            <div className="mt-2 space-y-1">
              {r.stderr && (
                <div>
                  <p className="font-semibold text-red-600">Error:</p>
                  <pre className="mt-0.5 text-red-700 font-mono whitespace-pre-wrap">{r.stderr}</pre>
                </div>
              )}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="font-semibold text-zinc-500">Expected:</p>
                  <pre className="mt-0.5 font-mono whitespace-pre-wrap">{r.expectedOutput}</pre>
                </div>
                <div>
                  <p className="font-semibold text-zinc-500">Got:</p>
                  <pre className="mt-0.5 font-mono whitespace-pre-wrap">{r.stdout || "(empty)"}</pre>
                </div>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
