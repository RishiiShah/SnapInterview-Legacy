"use client";

import { useState } from "react";

type SupportedLanguage = "javascript" | "python" | "cpp";

const LANGUAGES: { value: SupportedLanguage; label: string }[] = [
  { value: "javascript", label: "JavaScript" },
  { value: "python", label: "Python" },
  { value: "cpp", label: "C++" },
];

const fieldClass =
  "w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 transition-all focus:border-zinc-400 focus:bg-white focus:ring-2 focus:ring-zinc-100 font-mono";

type TestCase = { input: string; expectedOutput: string; isHidden: boolean };

type AdminCodingFieldsProps = {
  initialStarterCode?: Record<string, string>;
  initialTestCases?: TestCase[];
  initialSolutionCode?: Record<string, string>;
};

export function AdminCodingFields({
  initialStarterCode,
  initialTestCases,
  initialSolutionCode,
}: AdminCodingFieldsProps) {
  const [codeTab, setCodeTab] = useState<SupportedLanguage>("javascript");
  const [starterCode, setStarterCode] = useState<Record<string, string>>(
    initialStarterCode ?? { javascript: "", python: "", cpp: "" },
  );
  const [solutionCode, setSolutionCode] = useState<Record<string, string>>(
    initialSolutionCode ?? { javascript: "", python: "", cpp: "" },
  );
  const [testCases, setTestCases] = useState<TestCase[]>(
    initialTestCases ?? [{ input: "", expectedOutput: "", isHidden: false }],
  );

  const addTestCase = () => {
    setTestCases([...testCases, { input: "", expectedOutput: "", isHidden: false }]);
  };

  const removeTestCase = (index: number) => {
    setTestCases(testCases.filter((_, i) => i !== index));
  };

  const updateTestCase = (index: number, field: keyof TestCase, value: string | boolean) => {
    setTestCases(testCases.map((tc, i) => (i === index ? { ...tc, [field]: value } : tc)));
  };

  return (
    <div className="space-y-5">
      <input type="hidden" name="starterCode" value={JSON.stringify(starterCode)} />
      <input type="hidden" name="testCases" value={JSON.stringify(testCases)} />
      <input type="hidden" name="solutionCode" value={JSON.stringify(solutionCode)} />

      {/* Starter Code */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-zinc-700">Starter Code</label>
        <div className="flex items-center gap-1 mb-2">
          {LANGUAGES.map((l) => (
            <button
              key={l.value}
              type="button"
              onClick={() => setCodeTab(l.value)}
              className={`cursor-pointer rounded-md px-3 py-1 text-xs font-semibold transition-all ${
                codeTab === l.value
                  ? "bg-zinc-900 text-white"
                  : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200"
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>
        <textarea
          rows={8}
          value={starterCode[codeTab] ?? ""}
          onChange={(e) => setStarterCode({ ...starterCode, [codeTab]: e.target.value })}
          className={fieldClass}
          placeholder={`// ${codeTab} starter code`}
        />
      </div>

      {/* Solution Code */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-zinc-700">Solution Code</label>
        <textarea
          rows={8}
          value={solutionCode[codeTab] ?? ""}
          onChange={(e) => setSolutionCode({ ...solutionCode, [codeTab]: e.target.value })}
          className={fieldClass}
          placeholder={`// ${codeTab} solution code`}
        />
      </div>

      {/* Test Cases */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-zinc-700">Test Cases</label>
          <button
            type="button"
            onClick={addTestCase}
            className="cursor-pointer rounded-lg border border-zinc-200 px-3 py-1 text-xs font-semibold text-zinc-600 hover:bg-zinc-50"
          >
            + Add Case
          </button>
        </div>
        <div className="space-y-3">
          {testCases.map((tc, i) => (
            <div key={i} className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-500">Case {i + 1}</span>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1.5 text-xs text-zinc-500">
                    <input
                      type="checkbox"
                      checked={tc.isHidden}
                      onChange={(e) => updateTestCase(i, "isHidden", e.target.checked)}
                      className="rounded"
                    />
                    Hidden
                  </label>
                  {testCases.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeTestCase(i)}
                      className="cursor-pointer text-xs text-red-500 hover:text-red-700"
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
                className={fieldClass}
                placeholder="Input (stdin)"
              />
              <textarea
                rows={2}
                value={tc.expectedOutput}
                onChange={(e) => updateTestCase(i, "expectedOutput", e.target.value)}
                className={fieldClass}
                placeholder="Expected output (stdout)"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
