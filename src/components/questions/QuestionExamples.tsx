"use client";

type TestCase = { input: string; expectedOutput: string; isHidden: boolean };

/** Format sample input closer to LeetCode's `nums = …, target = …` style when obvious. */
function formatInputBlock(input: string): string {
  const lines = input
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length === 0) return "";

  if (
    lines.length === 2 &&
    lines[0].startsWith("[") &&
    lines[0].endsWith("]") &&
    /^-?\d+(\.\d+)?$/.test(lines[1])
  ) {
    return `nums = ${lines[0]}, target = ${lines[1]}`;
  }

  if (lines.every((line) => line.includes("="))) {
    return lines.join(", ");
  }

  return lines.join("\n");
}

/**
 * LeetCode-style examples derived from visible sample test cases.
 */
export function QuestionExamples({ testCases }: { testCases: TestCase[] }) {
  const examples = testCases.filter((tc) => !tc.isHidden);

  if (examples.length === 0) return null;

  return (
    <div className="space-y-5">
      {examples.map((tc, index) => (
        <div key={`${index}-${tc.expectedOutput}`}>
          <p className="mb-2 text-sm font-semibold text-[#F2F4F8]">Example {index + 1}:</p>
          <div className="overflow-hidden rounded-lg bg-[#0B0C10]/80 px-3.5 py-3 font-mono text-[13px] leading-relaxed text-[#E8ECF4]">
            <div>
              <span className="font-sans text-[13px] font-semibold text-[#F2F4F8]">Input:</span>{" "}
              <span className="whitespace-pre-wrap">{formatInputBlock(tc.input)}</span>
            </div>
            <div className="mt-1.5">
              <span className="font-sans text-[13px] font-semibold text-[#F2F4F8]">Output:</span>{" "}
              <span className="whitespace-pre-wrap">{tc.expectedOutput}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
