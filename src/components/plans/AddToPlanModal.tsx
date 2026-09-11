"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import type { Question } from "@/data/types";
import { createInterviewPlan, getInterviewPlan, listInterviewPlans, putInterviewPlanGraph } from "@/lib/api/plans";
import type { InterviewPlan, InterviewPlanSummary, QuestionSetNodeConfig } from "@/lib/plans/graph";
import { IconPlus, IconXMark } from "@/components/ui/icons";

async function appendQuestion(plan: InterviewPlan, question: Question): Promise<InterviewPlan> {
  let found = false;
  const nodes = plan.nodes.map((node) => {
    if (found || node.type !== "question_set" || node.title !== "Saved questions") return node;
    const config = node.config as QuestionSetNodeConfig;
    if (config.question_ids.includes(question.id)) {
      found = true;
      return node;
    }
    if (config.question_ids.length >= 20) return node;
    found = true;
    return { ...node, config: { question_ids: [...config.question_ids, question.id] } };
  });
  if (!found) {
    nodes.push({
      id: crypto.randomUUID(),
      type: "question_set",
      title: "Saved questions",
      position_x: 280 + nodes.length * 45,
      position_y: 180 + nodes.length * 25,
      status: "available",
      config: { question_ids: [question.id] },
    });
  }
  return putInterviewPlanGraph(plan.id, { nodes, edges: plan.edges });
}

export default function AddToPlanModal({ question, onClose }: { question: Question; onClose(): void }) {
  const [plans, setPlans] = useState<InterviewPlanSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addedPlan, setAddedPlan] = useState<InterviewPlan | null>(null);

  useEffect(() => {
    void listInterviewPlans().then(setPlans).catch((cause) => setError(cause instanceof Error ? cause.message : "Could not load plans.")).finally(() => setLoading(false));
  }, []);

  async function add(planId?: string) {
    setBusy(true);
    setError(null);
    try {
      const plan = planId
        ? await getInterviewPlan(planId)
        : await createInterviewPlan({ title: question.text.slice(0, 80) });
      setAddedPlan(await appendQuestion(plan, question));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not add the question.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-white/[0.1] bg-[#12141A] p-5 shadow-2xl">
        <div className="flex items-start justify-between"><div><h2 className="font-semibold text-white">Add to interview plan</h2><p className="mt-1 text-xs text-[#8B93A7]">Save this question as a practice step.</p></div><button type="button" onClick={onClose} className="grid h-8 w-8 cursor-pointer place-items-center rounded-lg text-[#8B93A7] hover:bg-white/[0.05] hover:text-white"><IconXMark className="h-4 w-4" /></button></div>
        {addedPlan ? <div className="mt-5 rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-4 text-sm text-emerald-200">Added. <Link href={`/plans/${addedPlan.id}`} className="font-semibold underline">Open plan</Link></div> : (
          <div className="mt-5 space-y-2">
            <button type="button" disabled={busy} onClick={() => void add()} className="flex w-full cursor-pointer items-center gap-3 rounded-xl border border-[#3B82F6]/25 bg-[#3B82F6]/10 p-3 text-left text-sm font-medium text-[#BFDBFE] hover:bg-[#3B82F6]/15 disabled:opacity-50"><IconPlus className="h-4 w-4" />New plan from this question</button>
            {loading ? <p className="py-4 text-center text-sm text-[#8B93A7]">Loading plans…</p> : plans.map((plan) => <button key={plan.id} type="button" disabled={busy} onClick={() => void add(plan.id)} className="flex w-full cursor-pointer items-center justify-between rounded-xl p-3 text-left hover:bg-white/[0.04] disabled:opacity-50"><span className="truncate text-sm text-[#E8ECF4]">{plan.title}</span><span className="text-xs text-[#7D889B]">{plan.node_count} steps</span></button>)}
            {error ? <p role="alert" className="pt-2 text-xs text-rose-300">{error}</p> : null}
          </div>
        )}
      </div>
    </div>
  );
}
