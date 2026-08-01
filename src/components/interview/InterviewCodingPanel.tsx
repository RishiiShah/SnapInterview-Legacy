"use client";

import { useState, useCallback } from "react";
import Editor from "@monaco-editor/react";
import type { CodingChallenge } from "@/lib/interview/coding-challenge";
import {
  runTestCases,
  SUPPORTED_LANGUAGES,
  type SupportedLanguage,
  type RunResult,
} from "@/lib/code-runner";
import { TestCasePanel } from "@/components/questions/TestCasePanel";
import { TestResultPanel } from "@/components/questions/TestResultPanel";
import { IconSpinner } from "@/components/ui/icons";

type BottomTab = "testcase" | "result";

type InterviewCodingPanelProps = {
  challenge: CodingChallenge;
  onSubmitCode: (message: string) => void;
};

const MONACO_LANGUAGE_MAP: Record<string, string> = {
  javascript: "javascript",
  python: "python",
  cpp: "cpp",
};

export function InterviewCodingPanel({ challenge, onSubmitCode }: InterviewCodingPanelProps) {
  const availableLanguages = SUPPORTED_LANGUAGES.filter(
    (l) => challenge.starterCode[l.value],
  );
  const [language, setLanguage] = useState<SupportedLanguage>(
    availableLanguages[0]?.value ?? "javascript",
  );

  const [codeMap, setCodeMap] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const lang of availableLanguages) {
      initial[lang.value] = challenge.starterCode[lang.value] ?? "";
    }
    return initial;
  });

  const [bottomTab, setBottomTab] = useState<BottomTab>("testcase");
  const [runResult, setRunResult] = useState<RunResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);

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
      [language]: challenge.starterCode[language] ?? "",
    }));
    setRunResult(null);
  }, [language, challenge.starterCode]);

  const handleRun = useCallback(async () => {
    if (!challenge.testCases || isRunning) return;
    setIsRunning(true);
    setBottomTab("result");
    const result = await runTestCases(currentCode, language, challenge.testCases, true);
    setRunResult(result);
    setIsRunning(false);
  }, [currentCode, language, challenge.testCases, isRunning]);

  const handleSubmit = useCallback(async () => {
    if (!challenge.testCases || isRunning || hasSubmitted) return;
    setIsRunning(true);
    setBottomTab("result");
    const result = await runTestCases(currentCode, language, challenge.testCases, false);
    setRunResult(result);
    setIsRunning(false);
    setHasSubmitted(true);

    const passed = result.results.filter((r) => r.passed).length;
    const total = result.results.length;
    const langLabel = availableLanguages.find((l) => l.value === language)?.label ?? language;

    const message = `Here is my solution in ${langLabel}:\n\n\`\`\`${language}\n${currentCode}\n\`\`\`\n\nTest results: ${passed}/${total} passed`;
    onSubmitCode(message);
  }, [currentCode, language, challenge.testCases, isRunning, hasSubmitted, onSubmitCode, availableLanguages]);

  return (
    <div className="flex h-full flex-col bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden">
      {/* Top bar */}
      <div className="flex shrink-0 items-center justify-between border-b border-zinc-800 px-4 py-2">
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value as SupportedLanguage)}
          className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs font-semibold text-zinc-300 outline-none focus:border-zinc-500"
        >
          {availableLanguages.map((l) => (
            <option key={l.value} value={l.value}>
              {l.label}
            </option>
          ))}
        </select>
        <button
          onClick={handleReset}
          disabled={hasSubmitted}
          className="cursor-pointer rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-semibold text-zinc-600 transition-all hover:bg-zinc-800 hover:text-zinc-200 disabled:opacity-40"
        >
          Reset
        </button>
      </div>

      {/* Monaco Editor */}
      <div className="flex-1 min-h-0">
        <Editor
          height="100%"
          language={MONACO_LANGUAGE_MAP[language] ?? "plaintext"}
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
            readOnly: hasSubmitted,
          }}
        />
      </div>

      {/* Bottom panel */}
      <div className="shrink-0 border-t border-zinc-800">
        {/* Tab bar + actions */}
        <div className="flex items-center justify-between border-b border-zinc-800/50 px-4">
          <div className="flex items-center gap-1">
            {(["testcase", "result"] as BottomTab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setBottomTab(tab)}
                className={`relative cursor-pointer px-4 py-2 text-xs font-bold capitalize transition-all ${
                  bottomTab === tab ? "text-zinc-100" : "text-zinc-600 hover:text-zinc-300"
                }`}
              >
                {tab === "testcase" ? "Test Cases" : "Result"}
                {bottomTab === tab && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-zinc-100 rounded-full mx-2" />
                )}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 py-1.5">
            <button
              onClick={handleRun}
              disabled={isRunning || hasSubmitted}
              className="cursor-pointer rounded-lg border border-zinc-600 bg-zinc-800 px-4 py-1.5 text-xs font-bold text-zinc-300 transition-all hover:bg-zinc-700 disabled:opacity-40"
            >
              {isRunning ? <IconSpinner className="inline h-3 w-3 animate-spin" /> : "Run"}
            </button>
            <button
              onClick={handleSubmit}
              disabled={isRunning || hasSubmitted}
              className="cursor-pointer rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-bold text-white transition-all hover:bg-emerald-500 disabled:opacity-40"
            >
              {hasSubmitted ? "Submitted" : "Submit"}
            </button>
          </div>
        </div>

        {/* Panel content */}
        <div className="h-44 overflow-y-auto px-5 py-3 [&_pre]:!bg-zinc-800 [&_pre]:!text-zinc-300 [&_p]:!text-zinc-600 [&_button]:!bg-zinc-800 [&_button]:!text-zinc-600">
          {bottomTab === "testcase" ? (
            <TestCasePanel testCases={challenge.testCases} />
          ) : (
            <TestResultPanel runResult={runResult} isRunning={isRunning} />
          )}
        </div>
      </div>
    </div>
  );
}
