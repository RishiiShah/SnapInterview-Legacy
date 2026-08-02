"use client";

import { useState } from "react";
import { adminFieldClass, adminLabelClass } from "./admin-styles";

type SupportedLanguage = "javascript" | "python" | "cpp";

const LANGUAGES: { value: SupportedLanguage; label: string }[] = [
  { value: "javascript", label: "JavaScript" },
  { value: "python", label: "Python" },
  { value: "cpp", label: "C++" },
];

const codeFieldClass = `${adminFieldClass} font-mono`;

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

      <div>
        <label className={`mb-1.5 block ${adminLabelClass}`}>Starter Code</label>
        <div className="mb-2 flex items-center gap-1">
          {LANGUAGES.map((l) => (
            <button
              key={l.value}
              type="button"
              onClick={() => setCodeTab(l.value)}
              className={`cursor-pointer rounded-md px-3 py-1 text-xs font-semibold transition-all ${
                codeTab === l.value
                  ? "bg-[#3B82F6] text-white"
                  : "bg-white/[0.04] text-[#A8B0C2] hover:bg-white/[0.06] hover:text-[#E8ECF4]"
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
          className={codeFieldClass}
          placeholder={`// ${codeTab} starter code`}
        />
      </div>

      <div>
        <label className={`mb-1.5 block ${adminLabelClass}`}>Solution Code</label>
        <textarea
          rows={8}
          value={solutionCode[codeTab] ?? ""}
          onChange={(e) => setSolutionCode({ ...solutionCode, [codeTab]: e.target.value })}
          className={codeFieldClass}
          placeholder={`// ${codeTab} solution code`}
        />
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className={adminLabelClass}>Test Cases</label>
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
                  <label className="flex items-center gap-1.5 text-xs text-[#A8B0C2]">
                    <input
                      type="checkbox"
                      checked={tc.isHidden}
                      onChange={(e) => updateTestCase(i, "isHidden", e.target.checked)}
                      className="rounded border-white/20 bg-white/[0.04]"
                    />
                    Hidden
                  </label>
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
                placeholder="Input (stdin)"
              />
              <textarea
                rows={2}
                value={tc.expectedOutput}
                onChange={(e) => updateTestCase(i, "expectedOutput", e.target.value)}
                className={codeFieldClass}
                placeholder="Expected output (stdout)"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
