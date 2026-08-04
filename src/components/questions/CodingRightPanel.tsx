"use client";

import { useState, useCallback } from "react";
import Editor from "@monaco-editor/react";
import type { CodingWorkspaceQuestion } from "@/lib/coding/contracts";
import {
  runTestCases,
  SUPPORTED_LANGUAGES,
  type SupportedLanguage,
  type RunResult,
} from "@/lib/code-runner";
import { TestCasePanel } from "./TestCasePanel";
import { TestResultPanel } from "./TestResultPanel";
import {
  IconCheckCircle,
  IconChevronUp,
  IconCode,
  IconHelp,
  IconMaximize,
  IconMinimize,
  IconPlay,
  IconSpinner,
  IconTerminal,
} from "@/components/ui/icons";
import { useResizableSplit } from "@/hooks/useResizableSplit";
import { cn } from "@/lib/utils";

type BottomTab = "testcase" | "result";

type CodingRightPanelProps = {
  question: CodingWorkspaceQuestion;
};

const MONACO_LANGUAGE_MAP: Record<SupportedLanguage, string> = {
  javascript: "javascript",
  python: "python",
  cpp: "cpp",
};

export function CodingRightPanel({ question }: CodingRightPanelProps) {
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
  const [collapsed, setCollapsed] = useState(false);
  const [maximized, setMaximized] = useState(false);

  const {
    percent: editorPercent,
    containerRef: verticalRef,
    handleProps: verticalHandleProps,
  } = useResizableSplit({
    orientation: "vertical",
    initialPercent: 62,
    minPercent: 35,
    maxPercent: 78,
    storageKey: "snap-question-split-v",
  });

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
    if (isRunning) return;
    setIsRunning(true);
    setCollapsed(false);
    setBottomTab("result");
    const result = await runTestCases(currentCode, language, question.sampleTestCases);
    setRunResult(result);
    setIsRunning(false);
  }, [currentCode, language, question.sampleTestCases, isRunning]);

  const editorHeight = collapsed
    ? "calc(100% - 2.75rem)"
    : maximized
      ? "calc(28% - 4px)"
      : `calc(${editorPercent}% - 4px)`;

  return (
    <div ref={verticalRef} className="relative flex min-h-0 min-w-0 flex-1 flex-col">
      {/* Code pane */}
      <div
        className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-white/[0.08] bg-[#12141A]/90"
        style={{ height: editorHeight }}
      >
        <div className="flex h-10 shrink-0 items-center justify-between border-b border-white/[0.06] px-3">
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as SupportedLanguage)}
            className="cursor-pointer rounded-md border-0 bg-transparent px-2 py-1 text-xs font-medium text-[#E8ECF4] outline-none hover:bg-white/[0.05]"
          >
            {availableLanguages.map((l) => (
              <option key={l.value} value={l.value} className="bg-[#12141A] text-[#E8ECF4]">
                {l.label}
              </option>
            ))}
          </select>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRun}
              disabled={isRunning}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-md bg-white/[0.06] px-3 py-1.5 text-xs font-semibold text-[#E8ECF4] transition-colors hover:bg-white/[0.1] focus:outline-none disabled:opacity-40"
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
              onClick={handleReset}
              className="cursor-pointer rounded-md px-2.5 py-1 text-xs font-medium text-[#A8B0C2] transition-colors hover:bg-white/[0.05] hover:text-[#E8ECF4] focus:outline-none"
            >
              Reset
            </button>
          </div>
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
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
              lineNumbers: "on",
              scrollBeyondLastLine: false,
              automaticLayout: true,
              tabSize: 2,
              padding: { top: 12, bottom: 12 },
              dropIntoEditor: { enabled: false },
              dragAndDrop: false,
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
      </div>

      {!collapsed ? (
        <div
          role="separator"
          aria-orientation="horizontal"
          aria-label="Resize editor and testcase"
          tabIndex={0}
          className={cn(
            "group relative z-10 h-2 shrink-0 cursor-row-resize touch-none",
            "before:absolute before:inset-x-0 before:top-1/2 before:h-px before:-translate-y-1/2 before:bg-white/[0.08]",
            "hover:before:bg-[#3B82F6]/50 active:before:bg-[#3B82F6]",
          )}
          {...verticalHandleProps}
        />
      ) : null}

      {/* Testcase pane — LeetCode-style chrome */}
      <div
        className={cn(
          "flex flex-col overflow-hidden rounded-xl border border-white/[0.08] bg-[#12141A]/90",
          collapsed ? "h-11 shrink-0" : "min-h-0 flex-1",
        )}
      >
        <div className="flex h-11 shrink-0 items-center justify-between border-b border-white/[0.06] px-3">
          <div className="flex items-center">
            <button
              type="button"
              onClick={() => {
                setCollapsed(false);
                setBottomTab("testcase");
              }}
              className={cn(
                "inline-flex cursor-pointer items-center gap-2 px-2 py-1.5 text-[13px] font-medium transition-colors focus:outline-none",
                bottomTab === "testcase" ? "text-[#F2F4F8]" : "text-[#A8B0C2] hover:text-[#C5CBD8]",
              )}
            >
              <IconCheckCircle
                className={cn(
                  "h-4 w-4",
                  bottomTab === "testcase" ? "text-emerald-400" : "text-[#6B7385]",
                )}
              />
              Testcase
            </button>
            <span className="mx-1 h-4 w-px bg-white/[0.1]" aria-hidden />
            <button
              type="button"
              onClick={() => {
                setCollapsed(false);
                setBottomTab("result");
              }}
              className={cn(
                "inline-flex cursor-pointer items-center gap-2 px-2 py-1.5 text-[13px] font-medium transition-colors focus:outline-none",
                bottomTab === "result" ? "text-[#F2F4F8]" : "text-[#A8B0C2] hover:text-[#C5CBD8]",
              )}
            >
              <IconTerminal
                className={cn(
                  "h-4 w-4",
                  bottomTab === "result" ? "text-[#C5CBD8]" : "text-[#6B7385]",
                )}
              />
              Test Result
            </button>
          </div>

          <div className="flex items-center gap-0.5">
            <button
              type="button"
              aria-label={maximized ? "Restore panel size" : "Expand panel"}
              onClick={() => {
                setCollapsed(false);
                setMaximized((v) => !v);
              }}
              className="grid h-8 w-8 cursor-pointer place-items-center rounded-md text-[#A8B0C2] transition-colors hover:bg-white/[0.06] hover:text-[#E8ECF4] focus:outline-none"
            >
              {maximized ? (
                <IconMinimize className="h-3.5 w-3.5" />
              ) : (
                <IconMaximize className="h-3.5 w-3.5" />
              )}
            </button>
            <button
              type="button"
              aria-label={collapsed ? "Expand testcase panel" : "Collapse testcase panel"}
              onClick={() => {
                setCollapsed((v) => !v);
                if (!collapsed) setMaximized(false);
              }}
              className="grid h-8 w-8 cursor-pointer place-items-center rounded-md text-[#A8B0C2] transition-colors hover:bg-white/[0.06] hover:text-[#E8ECF4] focus:outline-none"
            >
              <IconChevronUp
                className={cn("h-4 w-4 transition-transform", collapsed && "rotate-180")}
              />
            </button>
          </div>
        </div>

        {!collapsed ? (
          <>
            <div className="min-h-0 flex-1 overflow-hidden">
              {bottomTab === "testcase" ? (
                <TestCasePanel testCases={question.sampleTestCases} editable={false} />
              ) : (
                <div className="h-full overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  <TestResultPanel runResult={runResult} isRunning={isRunning} />
                </div>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-2 border-t border-white/[0.06] px-3 py-2">
              <span className="inline-flex items-center gap-1.5 text-xs text-[#A8B0C2]">
                <IconCode className="h-3.5 w-3.5" />
                Source
              </span>
              <button
                type="button"
                aria-label="Help"
                className="grid h-6 w-6 cursor-pointer place-items-center rounded text-[#6B7385] transition-colors hover:text-[#A8B0C2] focus:outline-none"
                title="Sample inputs mirror the visible testcases for this problem."
              >
                <IconHelp className="h-3.5 w-3.5" />
              </button>
              <span className="text-xs text-[#6B7385]">Runs public sample cases in your browser.</span>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
