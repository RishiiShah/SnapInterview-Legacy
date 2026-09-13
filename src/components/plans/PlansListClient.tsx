"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  createInterviewPlan,
  deleteInterviewPlan,
  previewInterviewPlanBlueprint,
  type InterviewPlanBlueprintPreview,
} from "@/lib/api/plans";
import type { InterviewPlanSummary } from "@/lib/plans/graph";
import { IconArrowRight, IconPlus, IconTrash, IconWorkflow } from "@/components/ui/icons";
import { COMPANIES, EXPERIENCE_LEVELS, ROLES } from "@/data/constants";
import type { InterviewLevel } from "@/lib/interview/domain";

type TemplateSummary = { key: string; title: string; description: string; nodeCount: number };

export default function PlansListClient({
  initialPlans,
  templates,
}: {
  initialPlans: InterviewPlanSummary[];
  templates: TemplateSummary[];
}) {
  const router = useRouter();
  const [plans, setPlans] = useState(initialPlans);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [company, setCompany] = useState("Google");
  const [role, setRole] = useState("Software Engineer");
  const [level, setLevel] = useState<InterviewLevel>("mid-level");
  const [interviewDate, setInterviewDate] = useState("");
  const [blueprint, setBlueprint] = useState<InterviewPlanBlueprintPreview | null>(null);

  async function create(title: string, templateKey?: string) {
    setBusyKey(templateKey ?? "blank");
    setError(null);
    try {
      const plan = await createInterviewPlan({ title, template_key: templateKey });
      router.push(`/plans/${plan.id}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not create the plan.");
      setBusyKey(null);
    }
  }

  async function remove(id: string) {
    setBusyKey(id);
    setError(null);
    try {
      await deleteInterviewPlan(id);
      setPlans((current) => current.filter((plan) => plan.id !== id));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not delete the plan.");
    } finally {
      setBusyKey(null);
    }
  }

  async function previewTarget() {
    setBusyKey("preview");
    setError(null);
    try {
      setBlueprint(await previewInterviewPlanBlueprint({ company, role, level }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not preview this interview loop.");
    } finally {
      setBusyKey(null);
    }
  }

  async function createTargetedPlan() {
    if (!blueprint) return;
    setBusyKey("targeted");
    setError(null);
    try {
      const plan = await createInterviewPlan({
        title: `${company} ${role} preparation`,
        blueprint_key: blueprint.key,
        target: {
          company,
          role,
          level,
          interview_date: interviewDate || undefined,
        },
      });
      router.push(`/plans/${plan.id}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not create the targeted plan.");
      setBusyKey(null);
    }
  }

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#60A5FA]">Practice workflow</p>
          <h1 className="mt-2 font-display text-4xl tracking-[-0.03em] text-[#F2F4F8]">Interview Plans</h1>
          <p className="mt-3 max-w-2xl text-[#A8B0C2]">Build a sequence of mock interviews and practice questions, then work through it at your pace.</p>
        </div>
        <button
          type="button"
          disabled={busyKey !== null}
          onClick={() => void create("Untitled interview plan")}
          className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-lg bg-[#3B82F6] px-4 text-sm font-semibold text-white hover:bg-[#4B8FF7] disabled:opacity-50"
        >
          <IconPlus className="h-4 w-4" /> Blank plan
        </button>
      </div>

      {error ? <p role="alert" className="rounded-lg border border-rose-500/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</p> : null}

      <section className="rounded-2xl border border-[#3B82F6]/20 bg-[#121722] p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#60A5FA]">Targeted interview loop</p><h2 className="mt-2 text-xl font-semibold text-[#F2F4F8]">Build for a specific company and role</h2><p className="mt-2 max-w-2xl text-sm text-[#A8B0C2]">Preview independent rounds with company-, role-, and level-specific focus.</p></div>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-4">
          <label><span className="mb-2 block text-xs font-medium text-[#A8B0C2]">Company</span><select value={company} onChange={(event) => { setCompany(event.target.value); setBlueprint(null); }} className="h-10 w-full rounded-lg border border-white/[0.1] bg-[#171A22] px-3 text-sm text-white outline-none focus:border-[#3B82F6]/55">{COMPANIES.map((item) => <option key={item}>{item}</option>)}</select></label>
          <label><span className="mb-2 block text-xs font-medium text-[#A8B0C2]">Role</span><select value={role} onChange={(event) => { setRole(event.target.value); setBlueprint(null); }} className="h-10 w-full rounded-lg border border-white/[0.1] bg-[#171A22] px-3 text-sm text-white outline-none focus:border-[#3B82F6]/55">{ROLES.map((item) => <option key={item}>{item}</option>)}</select></label>
          <label><span className="mb-2 block text-xs font-medium text-[#A8B0C2]">Level</span><select value={level} onChange={(event) => { setLevel(event.target.value as InterviewLevel); setBlueprint(null); }} className="h-10 w-full rounded-lg border border-white/[0.1] bg-[#171A22] px-3 text-sm text-white outline-none focus:border-[#3B82F6]/55">{EXPERIENCE_LEVELS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
          <label><span className="mb-2 block text-xs font-medium text-[#A8B0C2]">Interview date <span className="text-[#6B7385]">(optional)</span></span><input type="date" value={interviewDate} onChange={(event) => setInterviewDate(event.target.value)} className="h-10 w-full rounded-lg border border-white/[0.1] bg-[#171A22] px-3 text-sm text-white outline-none focus:border-[#3B82F6]/55" /></label>
        </div>
        <button type="button" disabled={busyKey !== null} onClick={() => void previewTarget()} className="mt-4 h-10 cursor-pointer rounded-lg bg-[#3B82F6] px-4 text-sm font-semibold text-white hover:bg-[#4B8FF7] disabled:opacity-50">{busyKey === "preview" ? "Finding loop…" : "Preview interview loop"}</button>
        {blueprint ? (
          <div className="mt-5 rounded-xl border border-white/[0.08] bg-[#0F1219] p-4">
            <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-semibold text-[#F2F4F8]">{blueprint.title}</h3><p className="mt-1 text-xs text-[#8B93A7]">Version {blueprint.version} · reviewed {blueprint.reviewed_at} · {blueprint.resolution === "exact" ? "Exact company-role match" : "Fallback match"}</p></div><button type="button" disabled={busyKey !== null} onClick={() => void createTargetedPlan()} className="h-9 cursor-pointer rounded-lg bg-emerald-500/15 px-4 text-sm font-semibold text-emerald-300 hover:bg-emerald-500/20 disabled:opacity-50">{busyKey === "targeted" ? "Creating…" : "Create this plan"}</button></div>
            <p className="mt-3 text-sm text-[#A8B0C2]">{blueprint.description}</p>
            <div className="mt-4 grid gap-2 md:grid-cols-2">{blueprint.rounds.map((round) => <div key={round.round_key} className="rounded-lg border border-white/[0.07] bg-white/[0.02] p-3"><div className="flex items-center justify-between gap-2"><p className="text-sm font-medium text-[#E8ECF4]">{round.title}</p><span className="text-[10px] uppercase tracking-wide text-[#7D889B]">{round.duration_minutes} min</span></div><p className="mt-1 text-xs leading-relaxed text-[#8B93A7]">{round.purpose}</p></div>)}</div>
            <p className="mt-4 text-[11px] leading-relaxed text-[#6B7385]">{blueprint.sources_note}</p>
          </div>
        ) : null}
      </section>

      <section>
        <h2 className="text-sm font-semibold text-[#E8ECF4]">Start from a template</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {templates.map((template) => (
            <button
              key={template.key}
              type="button"
              disabled={busyKey !== null}
              onClick={() => void create(template.title, template.key)}
              className="group cursor-pointer rounded-2xl border border-white/[0.08] bg-[#12141A]/80 p-5 text-left transition hover:border-[#3B82F6]/35 hover:bg-[#171A22] disabled:opacity-50"
            >
              <div className="flex items-center justify-between">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#3B82F6]/10 text-[#60A5FA]"><IconWorkflow className="h-5 w-5" /></span>
                <span className="text-xs text-[#7D889B]">{template.nodeCount} steps</span>
              </div>
              <h3 className="mt-5 font-semibold text-[#F2F4F8]">{template.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[#A8B0C2]">{template.description}</p>
            </button>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-[#E8ECF4]">Your plans</h2>
        <div className="mt-4 overflow-hidden rounded-2xl border border-white/[0.08] bg-[#12141A]/70">
          {plans.length === 0 ? (
            <div className="px-6 py-12 text-center text-sm text-[#8B93A7]">No plans yet. Start blank or choose a template above.</div>
          ) : plans.map((plan) => {
            const progress = plan.node_count === 0 ? 0 : Math.round((plan.completed_node_count / plan.node_count) * 100);
            return (
              <div key={plan.id} className="flex items-center gap-4 border-b border-white/[0.06] px-5 py-4 last:border-0">
                <Link href={`/plans/${plan.id}`} className="min-w-0 flex-1">
                  <p className="truncate font-medium text-[#F2F4F8]">{plan.title}</p>
                  <p className="mt-1 text-xs text-[#8B93A7]">{plan.completed_node_count} of {plan.node_count} steps · {progress}% complete</p>
                </Link>
                <button type="button" aria-label={`Delete ${plan.title}`} disabled={busyKey !== null} onClick={() => void remove(plan.id)} className="grid h-9 w-9 cursor-pointer place-items-center rounded-lg text-[#7D889B] hover:bg-rose-500/10 hover:text-rose-300 disabled:opacity-40"><IconTrash className="h-4 w-4" /></button>
                <Link href={`/plans/${plan.id}`} aria-label={`Open ${plan.title}`} className="grid h-9 w-9 place-items-center rounded-lg text-[#A8B0C2] hover:bg-white/[0.05] hover:text-white"><IconArrowRight className="h-4 w-4" /></Link>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
