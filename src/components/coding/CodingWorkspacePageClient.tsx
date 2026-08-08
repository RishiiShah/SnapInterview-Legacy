"use client";

import Link from "next/link";

import { CodingConceptPanel } from "@/components/coding/CodingConceptPanel";
import type { CodingWorkspaceQuestion } from "@/lib/coding/contracts";

export function CodingWorkspacePageClient({
  question,
}: {
  question: CodingWorkspaceQuestion;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col gap-2 p-2">
      <div className="flex h-11 shrink-0 items-center justify-between rounded-xl border border-white/[0.08] bg-[#12141A]/90 px-4">
        <Link href="/coding" className="text-xs font-medium text-[#A8B0C2] hover:text-[#E8ECF4]">← Problem List</Link>
        <span className="text-xs text-[#8B93A7]">Concept workspace</span>
      </div>
      <div className="grid min-h-0 flex-1 gap-2 lg:grid-cols-[minmax(20rem,0.8fr)_minmax(0,1.2fr)]">
        <aside className="min-h-0 overflow-y-auto rounded-xl border border-white/[0.08] bg-[#12141A]/90 p-5 text-sm text-[#D5DBE8]">
          <h1 className="text-xl font-semibold text-[#F2F4F8]">{question.title}</h1>
          <div className="mt-2 flex gap-2 text-xs">
            <span className="rounded-full bg-white/[0.06] px-2 py-1 text-[#93C5FD]">{question.difficulty}</span>
            {question.topics.map((topic) => <span key={topic} className="rounded-full bg-white/[0.06] px-2 py-1 text-[#A8B0C2]">{topic}</span>)}
          </div>
          <div className="mt-5 whitespace-pre-wrap leading-relaxed">{question.description}</div>
          {question.constraints ? <section className="mt-6"><h2 className="font-semibold text-[#F2F4F8]">Constraints</h2><p className="mt-2 whitespace-pre-wrap font-mono text-xs text-[#C5CBD8]">{question.constraints}</p></section> : null}
          {question.hint ? <section className="mt-6"><h2 className="font-semibold text-[#F2F4F8]">Hint</h2><p className="mt-2 text-[#C5CBD8]">{question.hint}</p></section> : null}
        </aside>
        <CodingConceptPanel question={question} />
      </div>
    </div>
  );
}
