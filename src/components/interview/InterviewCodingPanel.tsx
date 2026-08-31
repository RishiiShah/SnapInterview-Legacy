"use client";

import { useState, useCallback } from "react";
import Editor from "@monaco-editor/react";
import type { CodingChallenge } from "@/lib/interview/coding-challenge";
import { runTestCases, type RunResult } from "@/lib/code-runner";
import { TestCasePanel } from "@/components/questions/TestCasePanel";
import { TestResultPanel } from "@/components/questions/TestResultPanel";
import {
  IconCheckCircle,
  IconPlay,
  IconSpinner,
  IconTerminal,
} from "@/components/ui/icons";

type BottomTab = "testcase" | "result";

type InterviewCodingPanelProps = {
  challenge: CodingChallenge;
  onSubmitCode: (message: string) => void;
};

export function InterviewCodingPanel({ challenge, onSubmitCode }: InterviewCodingPanelProps) {
  const [code, setCode] = useState(challenge.starterCode.javascript);
  const [bottomTab, setBottomTab] = useState<BottomTab>("testcase");
  const [runResult, setRunResult] = useState<RunResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  const handleCodeChange = useCallback((value: string | undefined) => {
    setCode(value ?? "");
  }, []);

  const handleReset = useCallback(() => {
    setCode(challenge.starterCode.javascript);
    setRunResult(null);
  }, [challenge.starterCode.javascript]);

  const handleRun = useCallback(async () => {
    if (!challenge.testCases || isRunning) return;
    setIsRunning(true);
    setBottomTab("result");
    const result = await runTestCases(code, challenge.testCases);
    setRunResult(result);
    setIsRunning(false);
  }, [code, challenge.testCases, isRunning]);

  const handleSubmit = useCallback(async () => {
    if (!challenge.testCases || isRunning || hasSubmitted) return;
    setIsRunning(true);
    setBottomTab("result");
    const result = await runTestCases(code, challenge.testCases);
    setRunResult(result);
    setIsRunning(false);
    setHasSubmitted(true);

    const passed = result.results.filter((r) => r.passed).length;
    const total = result.results.length;
    const message = `Here is my solution in JavaScript:\n\n\`\`\`javascript\n${code}\n\`\`\`\n\nTest results: ${passed}/${total} passed`;
    onSubmitCode(message);
  }, [code, challenge.testCases, isRunning, hasSubmitted, onSubmitCode]);

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-white/[0.08] bg-[#12141A]/90">
      {/* Editor chrome */}
      <div className="flex h-10 shrink-0 items-center justify-between border-b border-white/[0.06] px-3">
        <span className="px-2 py-1 text-xs font-medium text-[#E8ECF4]">JavaScript</span>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleRun}
            disabled={isRunning || hasSubmitted}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-md bg-white/[0.06] px-3 py-1.5 text-xs font-semibold text-[#E8ECF4] transition-colors hover:bg-white/[0.1] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isRunning ? (
              <IconSpinner className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <IconPlay className="h-3.5 w-3.5" />
            )}
            Run
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isRunning || hasSubmitted}
            className="inline-flex cursor-pointer items-center rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {hasSubmitted ? "Submitted" : "Submit"}
          </button>
          <button
            type="button"
            onClick={handleReset}
            disabled={hasSubmitted}
            className="cursor-pointer rounded-md px-2.5 py-1 text-xs font-medium text-[#A8B0C2] transition-colors hover:bg-white/[0.05] hover:text-[#E8ECF4] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Monaco */}
      <div className="min-h-0 flex-1">
        <Editor
          height="100%"
          language="javascript"
          value={code}
          onChange={handleCodeChange}
          theme="vs-dark"
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
            lineNumbers: "on",
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 2,
            padding: { top: 12, bottom: 12 },
            readOnly: hasSubmitted,
            renderLineHighlight: "line",
            overviewRulerLanes: 0,
            hideCursorInOverviewRuler: true,
            scrollbar: {
              verticalScrollbarSize: 8,
              horizontalScrollbarSize: 8,
              useShadows: false,
            },
          }}
        />
      </div>

      {/* Testcase / result pane */}
      <div className="flex h-52 shrink-0 flex-col border-t border-white/[0.06]">
        <div className="flex h-10 shrink-0 items-center border-b border-white/[0.06] px-3">
          <button
            type="button"
            onClick={() => setBottomTab("testcase")}
            className={`inline-flex cursor-pointer items-center gap-2 px-2 py-1.5 text-[13px] font-medium transition-colors ${
              bottomTab === "testcase"
                ? "text-[#F2F4F8]"
                : "text-[#A8B0C2] hover:text-[#C5CBD8]"
            }`}
          >
            <IconCheckCircle
              className={`h-4 w-4 ${
                bottomTab === "testcase" ? "text-emerald-400" : "text-[#6B7385]"
              }`}
            />
            Testcase
          </button>
          <span className="mx-1 h-4 w-px bg-white/[0.1]" aria-hidden />
          <button
            type="button"
            onClick={() => setBottomTab("result")}
            className={`inline-flex cursor-pointer items-center gap-2 px-2 py-1.5 text-[13px] font-medium transition-colors ${
              bottomTab === "result"
                ? "text-[#F2F4F8]"
                : "text-[#A8B0C2] hover:text-[#C5CBD8]"
            }`}
          >
            <IconTerminal
              className={`h-4 w-4 ${
                bottomTab === "result" ? "text-[#C5CBD8]" : "text-[#6B7385]"
              }`}
            />
            Test Result
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 [scrollbar-width:thin] [&_button]:!bg-white/[0.04] [&_button]:!text-[#A8B0C2] [&_p]:!text-[#8B93A7] [&_pre]:!bg-white/[0.04] [&_pre]:!text-[#C5CBD8]">
          {bottomTab === "testcase" ? (
            <TestCasePanel testCases={challenge.testCases} editable={false} />
          ) : (
            <TestResultPanel runResult={runResult} isRunning={isRunning} />
          )}
        </div>
      </div>
    </div>
  );
}
