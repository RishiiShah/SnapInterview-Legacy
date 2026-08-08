"use client";

import Editor from "@monaco-editor/react";

import type { CodingWorkspaceQuestion } from "@/lib/coding/contracts";

export function CodingConceptPanel({ question }: { question: CodingWorkspaceQuestion }) {
  return (
    <section className="flex min-h-0 flex-col gap-2" aria-label="Coding concept preview">
      <div className="rounded-xl border border-white/[0.08] bg-[#12141A]/90 p-4">
        <div className="flex items-center justify-between gap-3 border-b border-white/[0.06] pb-3">
          <div>
            <h2 className="font-semibold text-[#F2F4F8]">Concept preview</h2>
            <p className="mt-1 text-xs text-[#A8B0C2]">Execution and submission are not included.</p>
          </div>
          <span className="rounded bg-white/[0.06] px-2 py-1 text-xs text-[#93C5FD]">JavaScript</span>
        </div>
        <div className="mt-3 h-72 overflow-hidden rounded-lg border border-white/[0.06]">
          <Editor
            language="javascript"
            value={question.starterCode.javascript}
            theme="vs-dark"
            options={{ readOnly: true, minimap: { enabled: false }, scrollBeyondLastLine: false }}
          />
        </div>
      </div>

      <section className="rounded-xl border border-white/[0.08] bg-[#12141A]/90 p-4">
        <h2 className="font-semibold text-[#F2F4F8]">Public sample cases</h2>
        <div className="mt-3 grid gap-3">
          {question.sampleTestCases.map((testCase) => (
            <article key={testCase.ordinal} className="rounded-lg border border-white/[0.06] bg-black/10 p-3">
              <h3 className="text-sm font-medium text-[#E8ECF4]">Sample {testCase.ordinal}</h3>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div>
                  <h4 className="text-xs font-medium text-[#A8B0C2]">Input</h4>
                  <pre className="mt-1 overflow-x-auto whitespace-pre-wrap text-xs text-[#D5DBE8]">{testCase.input}</pre>
                </div>
                <div>
                  <h4 className="text-xs font-medium text-[#A8B0C2]">Expected output</h4>
                  <pre className="mt-1 overflow-x-auto whitespace-pre-wrap text-xs text-[#D5DBE8]">{testCase.expectedOutput}</pre>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}
