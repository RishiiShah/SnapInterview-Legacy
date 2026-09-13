"use client";

import { useMemo, useState } from "react";

import { IconSearch, IconXMark } from "@/components/ui/icons";
import type { Question } from "@/data/types";
import {
  INTERVIEW_TYPE_META,
  INTERVIEW_TYPE_VALUES,
  type Difficulty,
  type InterviewDuration,
  type InterviewType,
} from "@/lib/interview/domain";
import {
  MAX_PLAN_TITLE_LENGTH,
  MAX_QUESTIONS_PER_NODE,
  type InterviewNodeConfig,
  type InterviewPlanNode,
  type QuestionSetNodeConfig,
} from "@/lib/plans/graph";

export default function EditPlanNodeModal({
  node,
  questions,
  onClose,
  onSave,
}: {
  node: InterviewPlanNode;
  questions: Question[];
  onClose(): void;
  onSave(node: InterviewPlanNode): void;
}) {
  const interviewConfig = node.type === "interview" ? node.config as InterviewNodeConfig : null;
  const questionConfig = node.type === "question_set" ? node.config as QuestionSetNodeConfig : null;
  const [title, setTitle] = useState(node.title);
  const [interviewType, setInterviewType] = useState<InterviewType>(interviewConfig?.interview_type ?? "coding-algorithms");
  const [duration, setDuration] = useState<InterviewDuration>(interviewConfig?.duration_minutes ?? 30);
  const [difficulty, setDifficulty] = useState<Difficulty>(interviewConfig?.difficulty ?? "medium");
  const [selectedQuestions, setSelectedQuestions] = useState(() => new Set(questionConfig?.question_ids ?? []));
  const [search, setSearch] = useState("");
  const filteredQuestions = useMemo(() => {
    const query = search.trim().toLowerCase();
    return query
      ? questions.filter((question) => question.text.toLowerCase().includes(query) || question.tags.some((tag) => tag.toLowerCase().includes(query)))
      : questions;
  }, [questions, search]);
  const canSave = title.trim().length > 0 && (node.type === "interview" || selectedQuestions.size > 0);
  const isBlueprintRound = Boolean(interviewConfig?.round_profile);

  function toggleQuestion(id: number) {
    setSelectedQuestions((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else if (next.size < MAX_QUESTIONS_PER_NODE) next.add(id);
      return next;
    });
  }

  function save() {
    if (!canSave) return;
    onSave({
      ...node,
      title: title.trim(),
      config: node.type === "interview"
        ? isBlueprintRound
          ? node.config
          : { interview_type: interviewType, duration_minutes: duration, difficulty }
        : { question_ids: [...selectedQuestions] },
    });
  }

  return (
    <div role="dialog" aria-modal="true" aria-label="Edit workflow step" className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="flex max-h-[82vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-white/[0.1] bg-[#12141A] shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/[0.08] px-5 py-4">
          <div><h2 className="font-semibold text-white">Edit step</h2><p className="mt-1 text-xs text-[#8B93A7]">Update this node without changing its progress.</p></div>
          <button type="button" onClick={onClose} className="grid h-8 w-8 cursor-pointer place-items-center rounded-lg text-[#8B93A7] hover:bg-white/[0.05] hover:text-white"><IconXMark className="h-4 w-4" /></button>
        </div>
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5">
          <label className="block"><span className="mb-2 block text-xs font-medium text-[#A8B0C2]">Step title</span><input autoFocus value={title} maxLength={MAX_PLAN_TITLE_LENGTH} onChange={(event) => setTitle(event.target.value)} className="h-10 w-full rounded-lg border border-white/[0.1] bg-white/[0.03] px-3 text-sm text-white outline-none focus:border-[#3B82F6]/55" /></label>
          {node.type === "interview" ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {isBlueprintRound ? <div className="sm:col-span-2 rounded-xl border border-[#3B82F6]/20 bg-[#3B82F6]/[0.07] p-4"><p className="text-xs font-semibold text-[#93C5FD]">Blueprint-managed round</p><p className="mt-2 text-xs leading-relaxed text-[#A8B0C2]">{interviewConfig?.round_profile?.purpose}</p><p className="mt-3 text-[11px] text-[#7D889B]">{INTERVIEW_TYPE_META[interviewType].label} · {duration} minutes · {difficulty}</p></div> : <>
                <label className="sm:col-span-2"><span className="mb-2 block text-xs font-medium text-[#A8B0C2]">Interview type</span><select value={interviewType} onChange={(event) => setInterviewType(event.target.value as InterviewType)} className="h-10 w-full rounded-lg border border-white/[0.1] bg-[#171A22] px-3 text-sm text-white outline-none">{INTERVIEW_TYPE_VALUES.map((type) => <option key={type} value={type}>{INTERVIEW_TYPE_META[type].label}</option>)}</select></label>
                <label><span className="mb-2 block text-xs font-medium text-[#A8B0C2]">Duration</span><select value={duration} onChange={(event) => setDuration(Number(event.target.value) as InterviewDuration)} className="h-10 w-full rounded-lg border border-white/[0.1] bg-[#171A22] px-3 text-sm text-white outline-none">{[15, 30, 45].map((value) => <option key={value} value={value}>{value} minutes</option>)}</select></label>
                <label><span className="mb-2 block text-xs font-medium text-[#A8B0C2]">Difficulty</span><select value={difficulty} onChange={(event) => setDifficulty(event.target.value as Difficulty)} className="h-10 w-full rounded-lg border border-white/[0.1] bg-[#171A22] px-3 text-sm capitalize text-white outline-none">{["easy", "medium", "hard"].map((value) => <option key={value}>{value}</option>)}</select></label>
              </>}
            </div>
          ) : (
            <div>
              <div className="relative"><IconSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B7385]" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search questions" className="h-10 w-full rounded-lg border border-white/[0.1] bg-white/[0.03] pl-10 pr-3 text-sm text-white outline-none focus:border-[#3B82F6]/55" /></div>
              <p className="mt-2 text-xs text-[#8B93A7]">{selectedQuestions.size} of {MAX_QUESTIONS_PER_NODE} selected</p>
              <div className="mt-2 max-h-64 overflow-y-auto rounded-xl border border-white/[0.07] p-2">{filteredQuestions.map((question) => <label key={question.id} className="flex cursor-pointer items-start gap-3 rounded-lg p-2.5 hover:bg-white/[0.04]"><input type="checkbox" checked={selectedQuestions.has(question.id)} onChange={() => toggleQuestion(question.id)} className="mt-1 accent-[#3B82F6]" /><span className="text-sm leading-relaxed text-[#E8ECF4]">{question.text}</span></label>)}</div>
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 border-t border-white/[0.08] px-5 py-4"><button type="button" onClick={onClose} className="h-9 cursor-pointer rounded-lg px-4 text-sm text-[#A8B0C2] hover:bg-white/[0.05]">Cancel</button><button type="button" disabled={!canSave} onClick={save} className="h-9 cursor-pointer rounded-lg bg-[#3B82F6] px-4 text-sm font-semibold text-white hover:bg-[#4B8FF7] disabled:cursor-not-allowed disabled:opacity-40">Save changes</button></div>
      </div>
    </div>
  );
}
