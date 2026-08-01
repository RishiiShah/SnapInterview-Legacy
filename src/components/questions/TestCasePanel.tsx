"use client";

import { useState } from "react";

type TestCase = { input: string; expectedOutput: string; isHidden: boolean };

export function TestCasePanel({ testCases }: { testCases: TestCase[] }) {
  const visible = testCases.filter((tc) => !tc.isHidden);
  const [activeIndex, setActiveIndex] = useState(0);

  if (visible.length === 0) {
    return <p className="py-4 text-center text-sm text-[#A8B0C2]">No test cases available.</p>;
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
                ? "bg-[#3B82F6]/15 text-[#93C5FD] border border-[#3B82F6]/25"
                : "border border-transparent bg-white/[0.04] text-[#A8B0C2] hover:bg-white/[0.06] hover:text-[#C5CBD8]"
            }`}
          >
            Case {i + 1}
          </button>
        ))}
      </div>
      {tc && (
        <div className="space-y-2">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#A8B0C2]">Input</p>
            <pre className="mt-1 whitespace-pre-wrap rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 font-mono text-xs text-[#E8ECF4]">
              {tc.input}
            </pre>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#A8B0C2]">Expected Output</p>
            <pre className="mt-1 whitespace-pre-wrap rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 font-mono text-xs text-[#E8ECF4]">
              {tc.expectedOutput}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
