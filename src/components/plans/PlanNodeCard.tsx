"use client";

import { createContext, useContext } from "react";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";

import type { InterviewNodeConfig, InterviewPlanNode } from "@/lib/plans/graph";
import { IconCheck, IconPencil, IconPlay, IconTrash } from "@/components/ui/icons";

export type PlanFlowNode = Node<{ planNode: InterviewPlanNode }, "planNode">;

export const PlanActionsContext = createContext<{
  start(nodeId: string): void;
  skip(nodeId: string): void;
  complete(nodeId: string): void;
  edit(nodeId: string): void;
  remove(nodeId: string): void;
} | null>(null);

const statusLabels: Record<InterviewPlanNode["status"], string> = {
  locked: "Locked",
  available: "Available",
  in_progress: "In progress",
  completed: "Completed",
  skipped: "Skipped",
};

export default function PlanNodeCard({ data, selected }: NodeProps<PlanFlowNode>) {
  const actions = useContext(PlanActionsContext);
  const node = data.planNode;
  const done = node.status === "completed" || node.status === "skipped";
  const locked = node.status === "locked";
  const roundProfile = node.type === "interview" ? (node.config as InterviewNodeConfig).round_profile : undefined;

  return (
    <div className={`w-64 rounded-2xl border bg-[#151820] p-4 shadow-xl transition ${selected ? "border-[#60A5FA]" : "border-white/[0.12]"} ${locked ? "opacity-60" : ""}`}>
      <Handle type="target" position={Position.Left} className="!h-3 !w-3 !border-2 !border-[#151820] !bg-[#60A5FA]" />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span className="rounded-full bg-white/[0.06] px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-[#A8B0C2]">
            {roundProfile ? roundProfile.stage.replace("_", " ") : node.type === "interview" ? "Mock interview" : "Question set"}
          </span>
          <h3 className="mt-3 line-clamp-2 text-sm font-semibold leading-snug text-[#F2F4F8]">{node.title}</h3>
          {roundProfile ? <p title={roundProfile.purpose} className="mt-2 line-clamp-2 text-[11px] leading-relaxed text-[#8B93A7]">{roundProfile.purpose}</p> : null}
        </div>
        <div className="nodrag flex shrink-0 gap-1">
          <button type="button" aria-label="Edit step" onClick={() => actions?.edit(node.id)} className="grid h-7 w-7 cursor-pointer place-items-center rounded-md text-[#7D889B] hover:bg-[#3B82F6]/10 hover:text-[#93C5FD]"><IconPencil className="h-3.5 w-3.5" /></button>
          <button type="button" aria-label="Remove step" onClick={() => actions?.remove(node.id)} className="grid h-7 w-7 cursor-pointer place-items-center rounded-md text-[#6B7385] hover:bg-rose-500/10 hover:text-rose-300"><IconTrash className="h-3.5 w-3.5" /></button>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between gap-2">
        <span className={`text-xs ${done ? "text-emerald-300" : node.status === "available" ? "text-[#93C5FD]" : "text-[#8B93A7]"}`}>
          {done ? <span className="inline-flex items-center gap-1"><IconCheck className="h-3.5 w-3.5" />{statusLabels[node.status]}</span> : statusLabels[node.status]}
        </span>
        {node.result_score != null ? <span className="font-mono text-xs text-[#C5CBD8]">{node.result_score}%</span> : null}
      </div>
      {roundProfile ? <p className="mt-2 truncate text-[10px] uppercase tracking-wide text-[#6B7385]">{roundProfile.competencies.slice(0, 3).join(" · ")}</p> : null}
      {!done ? (
        <div className="nodrag mt-4 flex gap-2">
          {!locked ? (
            <button type="button" onClick={() => actions?.start(node.id)} className="inline-flex h-8 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-[#3B82F6] px-3 text-xs font-semibold text-white hover:bg-[#4B8FF7]"><IconPlay className="h-3 w-3" />{node.status === "in_progress" ? "Resume" : "Start"}</button>
          ) : null}
          {node.type === "question_set" && node.status === "in_progress" ? (
            <button type="button" onClick={() => actions?.complete(node.id)} className="h-8 cursor-pointer rounded-lg border border-emerald-500/25 px-3 text-xs font-medium text-emerald-300 hover:bg-emerald-500/10">Complete</button>
          ) : null}
          {!locked ? <button type="button" onClick={() => actions?.skip(node.id)} className="h-8 cursor-pointer rounded-lg border border-white/[0.1] px-3 text-xs text-[#A8B0C2] hover:bg-white/[0.05]">Skip</button> : null}
        </div>
      ) : null}
      <Handle type="source" position={Position.Right} className="!h-3 !w-3 !border-2 !border-[#151820] !bg-[#60A5FA]" />
    </div>
  );
}
