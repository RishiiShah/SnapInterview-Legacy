"use client";

import { useMemo, useState } from "react";
import { IconPlus } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

export type TestCase = { input: string; expectedOutput: string; isHidden?: boolean };

const DEFAULT_ARG_NAMES = ["nums", "target", "arg3", "arg4", "arg5"];

/** Split stored multiline input into labeled fields (LeetCode-style). */
export function parseTestCaseFields(input: string): Array<{ name: string; value: string }> {
  const lines = input
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  return lines.map((line, i) => {
    const eq = line.indexOf("=");
    if (eq > 0 && eq < 32) {
      return { name: line.slice(0, eq).trim(), value: line.slice(eq + 1).trim() };
    }
    return { name: DEFAULT_ARG_NAMES[i] ?? `arg${i + 1}`, value: line };
  });
}

function fieldsToInput(fields: Array<{ name: string; value: string }>): string {
  return fields.map((f) => f.value).join("\n");
}

export function TestCasePanel({
  testCases,
  editable = true,
}: {
  testCases: TestCase[];
  /** Allow + / editing local custom cases (question workspace). */
  editable?: boolean;
}) {
  const seed = useMemo(() => testCases.filter((tc) => !tc.isHidden), [testCases]);
  const [customCases, setCustomCases] = useState<TestCase[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [drafts, setDrafts] = useState<Record<number, string>>({});

  const visible = [...seed, ...customCases];

  if (visible.length === 0) {
    return <p className="py-6 text-center text-sm text-[#A8B0C2]">No test cases available.</p>;
  }

  const safeIndex = Math.min(activeIndex, visible.length - 1);
  const tc = visible[safeIndex];
  const inputValue = drafts[safeIndex] ?? tc.input;
  const fields = parseTestCaseFields(inputValue);

  const updateField = (fieldIndex: number, value: string) => {
    const next = fields.map((f, i) => (i === fieldIndex ? { ...f, value } : f));
    setDrafts((prev) => ({ ...prev, [safeIndex]: fieldsToInput(next) }));
  };

  const addCase = () => {
    if (!editable) return;
    const template = seed[0] ?? { input: "", expectedOutput: "", isHidden: false };
    setCustomCases((prev) => [...prev, { ...template, isHidden: false }]);
    setActiveIndex(seed.length + customCases.length);
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-wrap items-center gap-1.5 px-4 pt-3">
        {visible.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setActiveIndex(i)}
            className={cn(
              "cursor-pointer rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors focus:outline-none",
              i === safeIndex
                ? "bg-white/[0.1] text-[#F2F4F8]"
                : "text-[#A8B0C2] hover:bg-white/[0.06] hover:text-[#C5CBD8]",
            )}
          >
            Case {i + 1}
          </button>
        ))}
        {editable ? (
          <button
            type="button"
            onClick={addCase}
            aria-label="Add test case"
            className="grid h-8 w-8 cursor-pointer place-items-center rounded-lg text-[#A8B0C2] transition-colors hover:bg-white/[0.06] hover:text-[#E8ECF4] focus:outline-none"
          >
            <IconPlus className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {fields.map((field, i) => (
          <div key={`${field.name}-${i}`}>
            <p className="mb-1.5 text-[13px] text-[#A8B0C2]">
              {field.name} <span className="text-[#6B7385]">=</span>
            </p>
            {editable ? (
              <input
                value={field.value}
                onChange={(e) => updateField(i, e.target.value)}
                spellCheck={false}
                className="w-full rounded-lg border-0 bg-[#0B0C10] px-3.5 py-2.5 font-mono text-sm text-[#F2F4F8] outline-none ring-0 placeholder:text-[#6B7385] focus:ring-1 focus:ring-[#3B82F6]/35"
              />
            ) : (
              <div className="w-full rounded-lg bg-[#0B0C10] px-3.5 py-2.5 font-mono text-sm text-[#F2F4F8]">
                {field.value}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
