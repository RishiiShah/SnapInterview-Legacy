"use client";

import Link from "next/link";

import type { CodingCatalogQuestion } from "@/repositories/coding-question-repo";

export function CodingCatalogPageClient({ questions }: { questions: CodingCatalogQuestion[] }) {
  return (
    <div className="mx-auto w-full max-w-6xl p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-[#F2F4F8]">Coding concepts</h1>
        <p className="mt-1 text-sm text-[#A8B0C2]">Explore conceptual workspaces with read-only JavaScript previews and public sample cases.</p>
      </div>
      <div className="grid gap-3">
        {questions.map((question) => (
          <Link
            key={question.id}
            href={`/coding/${question.slug}`}
            className="flex items-center justify-between rounded-xl border border-white/[0.08] bg-[#12141A]/90 p-4 transition-colors hover:bg-white/[0.05]"
          >
            <div>
              <h2 className="font-medium text-[#F2F4F8]">{question.title}</h2>
              <p className="mt-1 text-xs text-[#A8B0C2]">{question.topics.join(" · ")}</p>
            </div>
            <div className="text-right text-sm">
              <p className="font-medium text-[#93C5FD]">{question.difficulty}</p>
              <p className="mt-1 text-xs text-[#A8B0C2]">{question.estimatedTime ?? "Practice"}</p>
            </div>
          </Link>
        ))}
      </div>
      {questions.length === 0 ? <p className="py-16 text-center text-sm text-[#A8B0C2]">No published coding problems yet.</p> : null}
    </div>
  );
}
