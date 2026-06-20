"use client";

import { useState } from "react";

type TestCase = { input: string; expectedOutput: string; isHidden: boolean };

export function TestCasePanel({ testCases }: { testCases: TestCase[] }) {
  const visible = testCases.filter((tc) => !tc.isHidden);
  const [activeIndex, setActiveIndex] = useState(0);

  if (visible.length === 0) {
    return <p className="py-4 text-center text-sm text-zinc-500">No test cases available.</p>;
  }

  const tc = visible[activeIndex];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1">
        {visible.map((_, i) => (
          <button
            key={i}
            onClick={() => setActiveIndex(i)}
            className={`cursor-pointer rounded-md px-3 py-1 text-xs font-semibold transition-all ${
              i === activeIndex
                ? "bg-zinc-900 text-white"
                : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200"
            }`}
          >
            Case {i + 1}
          </button>
        ))}
      </div>
      {tc && (
        <div className="space-y-2">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Input</p>
            <pre className="mt-1 rounded-lg bg-zinc-100 px-3 py-2 text-xs text-zinc-700 font-mono whitespace-pre-wrap">
              {tc.input}
            </pre>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Expected Output</p>
            <pre className="mt-1 rounded-lg bg-zinc-100 px-3 py-2 text-xs text-zinc-700 font-mono whitespace-pre-wrap">
              {tc.expectedOutput}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
