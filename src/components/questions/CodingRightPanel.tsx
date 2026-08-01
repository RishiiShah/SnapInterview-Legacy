"use client";

import { useState, useCallback } from "react";
import Editor from "@monaco-editor/react";
import type { Question } from "@/data/types";
import {
  runTestCases,
  SUPPORTED_LANGUAGES,
  type SupportedLanguage,
  type RunResult,
} from "@/lib/code-runner";
import { TestCasePanel } from "./TestCasePanel";
import { TestResultPanel } from "./TestResultPanel";
import { IconSpinner } from "@/components/ui/icons";

type BottomTab = "testcase" | "result";

type CodingRightPanelProps = {
  question: Question;
  onSolved: () => void;
};

const MONACO_LANGUAGE_MAP: Record<SupportedLanguage, string> = {
  javascript: "javascript",
  python: "python",
  cpp: "cpp",
};

export function CodingRightPanel({ question, onSolved }: CodingRightPanelProps) {
  const availableLanguages = SUPPORTED_LANGUAGES.filter(
    (l) => question.starterCode?.[l.value],
  );
  const [language, setLanguage] = useState<SupportedLanguage>(
    availableLanguages[0]?.value ?? "javascript",
  );

  const [codeMap, setCodeMap] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const lang of availableLanguages) {
      initial[lang.value] = question.starterCode?.[lang.value] ?? "";
    }
    return initial;
  });

  const [bottomTab, setBottomTab] = useState<BottomTab>("testcase");
  const [runResult, setRunResult] = useState<RunResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const currentCode = codeMap[language] ?? "";

  const handleCodeChange = useCallback(
    (value: string | undefined) => {
      setCodeMap((prev) => ({ ...prev, [language]: value ?? "" }));
    },
    [language],
  );

  const handleReset = useCallback(() => {
    setCodeMap((prev) => ({
      ...prev,
      [language]: question.starterCode?.[language] ?? "",
    }));
    setRunResult(null);
  }, [language, question.starterCode]);

  const handleRun = useCallback(async () => {
    if (!question.testCases || isRunning) return;
    setIsRunning(true);
    setBottomTab("result");
    const result = await runTestCases(currentCode, language, question.testCases, true);
    setRunResult(result);
    setIsRunning(false);
  }, [currentCode, language, question.testCases, isRunning]);

  const handleSubmit = useCallback(async () => {
    if (!question.testCases || isRunning) return;
    setIsRunning(true);
    setBottomTab("result");
    const result = await runTestCases(currentCode, language, question.testCases, false);
    setRunResult(result);
    setIsRunning(false);
    if (result.allPassed) {
      onSolved();
    }
  }, [currentCode, language, question.testCases, isRunning, onSolved]);

  return (
    <div className="flex w-1/2 flex-col bg-white/[0.02]">
      <div className="flex shrink-0 items-center justify-between border-b border-white/[0.06] bg-white/[0.02] px-4 py-2">
        <div className="flex items-center gap-3">
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as SupportedLanguage)}
            className="rounded-lg border border-white/[0.1] bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-[#E8ECF4] outline-none focus:border-[#3B82F6]/50"
          >
            {availableLanguages.map((l) => (
              <option key={l.value} value={l.value} className="bg-[#12141A] text-[#E8ECF4]">
                {l.label}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={handleReset}
          className="cursor-pointer rounded-lg border border-white/[0.1] px-3 py-1.5 text-xs font-semibold text-[#C5CBD8] transition-all hover:bg-white/[0.05] hover:text-[#E8ECF4]"
        >
          Reset
        </button>
      </div>

      <div className="min-h-0 flex-1">
        <Editor
          height="100%"
          language={MONACO_LANGUAGE_MAP[language]}
          value={currentCode}
          onChange={handleCodeChange}
          theme="vs-dark"
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            lineNumbers: "on",
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 2,
            padding: { top: 12 },
            dropIntoEditor: { enabled: false },
            dragAndDrop: false,
          }}
        />
      </div>

      <div className="shrink-0 border-t border-white/[0.08] bg-white/[0.02]">
        <div className="flex items-center justify-between border-b border-white/[0.06] px-4">
          <div className="flex items-center gap-1">
            {(["testcase", "result"] as BottomTab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setBottomTab(tab)}
                className={`relative cursor-pointer px-4 py-2 text-xs font-bold capitalize transition-all ${
                  bottomTab === tab ? "text-[#F2F4F8]" : "text-[#A8B0C2] hover:text-[#C5CBD8]"
                }`}
              >
                {tab === "testcase" ? "Test Cases" : "Result"}
                {bottomTab === tab && (
                  <div className="absolute bottom-0 left-0 right-0 mx-2 h-0.5 rounded-full bg-[#3B82F6]" />
                )}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 py-1.5">
            <button
              onClick={handleRun}
              disabled={isRunning}
              className="cursor-pointer rounded-lg border border-white/[0.1] bg-white/[0.04] px-4 py-1.5 text-xs font-bold text-[#C5CBD8] transition-all hover:bg-white/[0.06] hover:text-[#E8ECF4] disabled:opacity-40"
            >
              {isRunning ? <IconSpinner className="inline h-3 w-3 animate-spin" /> : "Run"}
            </button>
            <button
              onClick={handleSubmit}
              disabled={isRunning}
              className="cursor-pointer rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-bold text-white transition-all hover:bg-emerald-500 disabled:opacity-40"
            >
              Submit
            </button>
          </div>
        </div>

        <div className="h-44 overflow-y-auto px-5 py-3">
          {bottomTab === "testcase" ? (
            <TestCasePanel testCases={question.testCases ?? []} />
          ) : (
            <TestResultPanel runResult={runResult} isRunning={isRunning} />
          )}
        </div>
      </div>
    </div>
  );
}
