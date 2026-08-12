"use client";

import { useState } from "react";
import { adminFieldClass, adminLabelClass } from "./admin-styles";

const codeFieldClass = `${adminFieldClass} font-mono`;

type TestCase = { input: string; expectedOutput: string };

type AdminCodingFieldsProps = {
  initialStarterCode?: Record<string, string>;
  initialTestCases?: TestCase[];
};

export function AdminCodingFields({
  initialStarterCode,
  initialTestCases,
}: AdminCodingFieldsProps) {
  const [starterCode, setStarterCode] = useState(initialStarterCode?.javascript ?? "");
  const [testCases, setTestCases] = useState<TestCase[]>(
    initialTestCases ?? [{ input: "", expectedOutput: "" }],
  );

  const addTestCase = () => {
    setTestCases([...testCases, { input: "", expectedOutput: "" }]);
  };

  const removeTestCase = (index: number) => {
    setTestCases(testCases.filter((_, i) => i !== index));
  };

  const updateTestCase = (index: number, field: keyof TestCase, value: string) => {
    setTestCases(testCases.map((tc, i) => (i === index ? { ...tc, [field]: value } : tc)));
  };

  return (
    <div className="space-y-5">
      <input type="hidden" name="starterCode" value={JSON.stringify({ javascript: starterCode })} />
      <input type="hidden" name="testCases" value={JSON.stringify(testCases)} />

      <div>
        <label className={`mb-1.5 block ${adminLabelClass}`}>JavaScript Preview Source</label>
        <textarea
          rows={8}
          value={starterCode}
          onChange={(e) => setStarterCode(e.target.value)}
          className={codeFieldClass}
          placeholder="// JavaScript preview source"
        />
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className={adminLabelClass}>Public Sample Cases</label>
          <button
            type="button"
            onClick={addTestCase}
            className="cursor-pointer rounded-lg border border-white/[0.1] px-3 py-1 text-xs font-semibold text-[#A8B0C2] hover:bg-white/[0.04] hover:text-[#E8ECF4]"
          >
            + Add Case
          </button>
        </div>
        <div className="space-y-3">
          {testCases.map((tc, i) => (
            <div
              key={i}
              className="space-y-2 rounded-xl border border-white/[0.08] bg-white/[0.02] p-4"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#A8B0C2]">Case {i + 1}</span>
                <div className="flex items-center gap-3">
                  {testCases.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeTestCase(i)}
                      className="cursor-pointer text-xs text-red-300 hover:text-red-200"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
              <textarea
                rows={2}
                value={tc.input}
                onChange={(e) => updateTestCase(i, "input", e.target.value)}
                className={codeFieldClass}
                placeholder="Sample input"
              />
              <textarea
                rows={2}
                value={tc.expectedOutput}
                onChange={(e) => updateTestCase(i, "expectedOutput", e.target.value)}
                className={codeFieldClass}
                placeholder="Expected output"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
