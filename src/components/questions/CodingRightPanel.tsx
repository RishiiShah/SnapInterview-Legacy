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
    <div className="flex w-1/2 flex-col bg-white">
      {/* Top bar */}
      <div className="flex shrink-0 items-center justify-between border-b border-zinc-100 px-4 py-2 bg-white/50 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as SupportedLanguage)}
            className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-semibold text-zinc-700 outline-none focus:border-zinc-400"
          >
            {availableLanguages.map((l) => (
              <option key={l.value} value={l.value}>
                {l.label}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={handleReset}
          className="cursor-pointer rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-semibold text-zinc-600 transition-all hover:bg-zinc-50 hover:text-zinc-700"
        >
          Reset
        </button>
      </div>

      {/* Monaco Editor */}
      <div className="flex-1 min-h-0">
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

      {/* Bottom panel */}
      <div className="shrink-0 border-t border-zinc-200 bg-zinc-50/30">
        {/* Tab bar + actions */}
        <div className="flex items-center justify-between border-b border-zinc-100 px-4">
          <div className="flex items-center gap-1">
            {(["testcase", "result"] as BottomTab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setBottomTab(tab)}
                className={`relative cursor-pointer px-4 py-2 text-xs font-bold capitalize transition-all ${
                  bottomTab === tab ? "text-zinc-900" : "text-zinc-600 hover:text-zinc-600"
                }`}
              >
                {tab === "testcase" ? "Test Cases" : "Result"}
                {bottomTab === tab && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-zinc-900 rounded-full mx-2" />
                )}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 py-1.5">
            <button
              onClick={handleRun}
              disabled={isRunning}
              className="cursor-pointer rounded-lg border border-zinc-300 bg-white px-4 py-1.5 text-xs font-bold text-zinc-700 transition-all hover:bg-zinc-50 disabled:opacity-40"
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

        {/* Panel content */}
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
