"use client";

import { useMemo, useState } from "react";

import type { Question } from "@/data/types";
import { MAX_QUESTIONS_PER_NODE } from "@/lib/plans/graph";
import { IconSearch, IconXMark } from "@/components/ui/icons";

export default function QuestionPickerModal({
  questions,
  onClose,
  onConfirm,
}: {
  questions: Question[];
  onClose(): void;
  onConfirm(questions: Question[]): void;
}) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const categories = useMemo(() => [...new Set(questions.map((question) => question.category))], [questions]);
  const filtered = useMemo(() => questions.filter((question) => {
    const matchesCategory = category === "all" || question.category === category;
    const query = search.trim().toLowerCase();
    return matchesCategory && (!query || question.text.toLowerCase().includes(query) || question.tags.some((tag) => tag.toLowerCase().includes(query)));
  }), [category, questions, search]);

  function toggle(id: number) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else if (next.size < MAX_QUESTIONS_PER_NODE) next.add(id);
      return next;
    });
  }

  return (
    <div role="dialog" aria-modal="true" aria-label="Add practice questions" className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="flex max-h-[80vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-white/[0.1] bg-[#12141A] shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/[0.08] px-5 py-4">
          <div><h2 className="font-semibold text-[#F2F4F8]">Add practice questions</h2><p className="mt-1 text-xs text-[#8B93A7]">Choose up to {MAX_QUESTIONS_PER_NODE} questions for one workflow step.</p></div>
          <button type="button" onClick={onClose} className="grid h-8 w-8 cursor-pointer place-items-center rounded-lg text-[#8B93A7] hover:bg-white/[0.05] hover:text-white"><IconXMark className="h-4 w-4" /></button>
        </div>
        <div className="border-b border-white/[0.08] p-4">
          <div className="relative"><IconSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B7385]" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search questions" className="h-10 w-full rounded-lg border border-white/[0.08] bg-white/[0.03] pl-10 pr-3 text-sm text-white outline-none focus:border-[#3B82F6]/50" /></div>
          <div className="mt-3 flex flex-wrap gap-2">{["all", ...categories].map((value) => <button key={value} type="button" onClick={() => setCategory(value)} className={`cursor-pointer rounded-full px-3 py-1 text-xs capitalize ${category === value ? "bg-[#3B82F6]/20 text-[#93C5FD]" : "bg-white/[0.04] text-[#A8B0C2]"}`}>{value.replace("-", " ")}</button>)}</div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          {filtered.map((question) => (
            <label key={question.id} className="flex cursor-pointer items-start gap-3 rounded-xl p-3 hover:bg-white/[0.04]">
              <input type="checkbox" checked={selected.has(question.id)} onChange={() => toggle(question.id)} className="mt-1 accent-[#3B82F6]" />
              <span><span className="block text-sm leading-relaxed text-[#E8ECF4]">{question.text}</span><span className="mt-1 block text-xs capitalize text-[#7D889B]">{question.category} · {question.difficulty}</span></span>
            </label>
          ))}
        </div>
        <div className="flex items-center justify-between border-t border-white/[0.08] px-5 py-4"><span className="text-xs text-[#8B93A7]">{selected.size} selected</span><div className="flex gap-2"><button type="button" onClick={onClose} className="h-9 cursor-pointer rounded-lg px-4 text-sm text-[#A8B0C2] hover:bg-white/[0.05]">Cancel</button><button type="button" disabled={selected.size === 0} onClick={() => onConfirm(questions.filter((question) => selected.has(question.id)))} className="h-9 cursor-pointer rounded-lg bg-[#3B82F6] px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">Add step</button></div></div>
      </div>
    </div>
  );
}
