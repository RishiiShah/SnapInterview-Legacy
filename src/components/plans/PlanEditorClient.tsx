"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  type Connection,
  type Edge,
  type EdgeChange,
  type OnConnectEnd,
  type NodeChange,
  type ReactFlowInstance,
  type XYPosition,
} from "@xyflow/react";

import EditPlanNodeModal from "@/components/plans/EditPlanNodeModal";
import PlanNodeCard, { PlanActionsContext, type PlanFlowNode } from "@/components/plans/PlanNodeCard";
import QuestionPickerModal from "@/components/plans/QuestionPickerModal";
import { IconArrowLeft, IconPlus, IconQuestionBank } from "@/components/ui/icons";
import type { Question } from "@/data/types";
import { INTERVIEW_TYPE_META, INTERVIEW_TYPE_VALUES, type Difficulty, type InterviewDuration, type InterviewType } from "@/lib/interview/domain";
import { completePlanNode, patchInterviewPlan, putInterviewPlanGraph, skipPlanNode, startPlanNode } from "@/lib/api/plans";
import { type InterviewPlan, type InterviewPlanEdge, type InterviewPlanNode, validatePlanGraph } from "@/lib/plans/graph";

const nodeTypes = { planNode: PlanNodeCard };

type AddRequest = {
  sourceId: string | null;
  position: XYPosition;
};

type QuickAddRequest = AddRequest & {
  screenPosition: XYPosition;
};

function toFlowNodes(nodes: InterviewPlanNode[]): PlanFlowNode[] {
  return nodes.map((node) => ({
    id: node.id,
    type: "planNode",
    position: { x: node.position_x, y: node.position_y },
    data: { planNode: node },
  }));
}

function toFlowEdges(edges: InterviewPlanEdge[]): Edge[] {
  return edges.map((edge) => ({ id: edge.id, source: edge.source_node_id, target: edge.target_node_id, type: "smoothstep" }));
}

export default function PlanEditorClient({
  initialPlan,
  questions,
  defaultRole,
}: {
  initialPlan: InterviewPlan;
  questions: Question[];
  defaultRole: string;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(initialPlan.title);
  const [flowNodes, setFlowNodes] = useState<PlanFlowNode[]>(() => toFlowNodes(initialPlan.nodes));
  const [flowEdges, setFlowEdges] = useState<Edge[]>(() => toFlowEdges(initialPlan.edges));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [questionAddRequest, setQuestionAddRequest] = useState<AddRequest | null>(null);
  const [quickAddRequest, setQuickAddRequest] = useState<QuickAddRequest | null>(null);
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance<PlanFlowNode, Edge> | null>(null);
  const [interviewType, setInterviewType] = useState<InterviewType>("coding-algorithms");
  const [duration, setDuration] = useState<InterviewDuration>(30);
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
  }, []);

  const domainGraph = useCallback((nodes = flowNodes, edges = flowEdges) => ({
    nodes: nodes.map((node) => ({ ...node.data.planNode, position_x: node.position.x, position_y: node.position.y })),
    edges: edges.map((edge) => ({ id: edge.id, source_node_id: edge.source, target_node_id: edge.target })),
  }), [flowEdges, flowNodes]);

  const adoptPlan = useCallback((plan: InterviewPlan) => {
    setFlowNodes(toFlowNodes(plan.nodes));
    setFlowEdges(toFlowEdges(plan.edges));
  }, []);

  const save = useCallback(async (nodes = flowNodes, edges = flowEdges) => {
    const graph = domainGraph(nodes, edges);
    if (!validatePlanGraph(graph)) {
      setMessage("Plans cannot contain loops or invalid connections in this version.");
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      adoptPlan(await putInterviewPlanGraph(initialPlan.id, graph));
      setMessage("Saved");
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "Could not save the plan.");
    } finally {
      setSaving(false);
    }
  }, [adoptPlan, domainGraph, flowEdges, flowNodes, initialPlan.id]);

  const scheduleSave = useCallback((nodes: PlanFlowNode[], edges: Edge[]) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => void save(nodes, edges), 800);
  }, [save]);

  const onNodesChange = useCallback((changes: NodeChange<PlanFlowNode>[]) => setFlowNodes((nodes) => applyNodeChanges(changes, nodes)), []);
  const onEdgesChange = useCallback((changes: EdgeChange<Edge>[]) => setFlowEdges((edges) => applyEdgeChanges(changes, edges)), []);
  const onConnect = useCallback((connection: Connection) => {
    const next = addEdge({ ...connection, id: crypto.randomUUID(), type: "smoothstep" }, flowEdges);
    if (!validatePlanGraph(domainGraph(flowNodes, next))) {
      setMessage("Plans cannot contain loops in this version.");
      return;
    }
    setFlowEdges(next);
    scheduleSave(flowNodes, next);
  }, [domainGraph, flowEdges, flowNodes, scheduleSave]);

  const onConnectEnd = useCallback<OnConnectEnd>((event, connectionState) => {
    if (connectionState.toNode || !connectionState.fromNode || connectionState.fromHandle?.type !== "source" || !reactFlowInstance) return;
    const pointer = "changedTouches" in event ? event.changedTouches[0] : event;
    if (!pointer) return;
    const screenPosition = { x: pointer.clientX, y: pointer.clientY };
    setQuickAddRequest({
      sourceId: connectionState.fromNode.id,
      position: reactFlowInstance.screenToFlowPosition(screenPosition),
      screenPosition,
    });
  }, [reactFlowInstance]);

  function addInterview(request: AddRequest | null = null) {
    const node: InterviewPlanNode = {
      id: crypto.randomUUID(),
      type: "interview",
      title: INTERVIEW_TYPE_META[interviewType].label,
      position_x: request?.position.x ?? 220 + flowNodes.length * 50,
      position_y: request?.position.y ?? 100 + flowNodes.length * 35,
      status: "available",
      config: { interview_type: interviewType, duration_minutes: duration, difficulty },
    };
    const next = [...flowNodes, ...toFlowNodes([node])];
    const nextEdges = request?.sourceId
      ? [...flowEdges, { id: crypto.randomUUID(), source: request.sourceId, target: node.id, type: "smoothstep" }]
      : flowEdges;
    setFlowNodes(next);
    setFlowEdges(nextEdges);
    setQuickAddRequest(null);
    scheduleSave(next, nextEdges);
  }

  function addQuestions(selected: Question[]) {
    const request = questionAddRequest;
    const node: InterviewPlanNode = {
      id: crypto.randomUUID(),
      type: "question_set",
      title: selected.length === 1 ? selected[0].text.slice(0, 80) : `${selected.length} practice questions`,
      position_x: request?.position.x ?? 260 + flowNodes.length * 45,
      position_y: request?.position.y ?? 180 + flowNodes.length * 30,
      status: "available",
      config: { question_ids: selected.map((question) => question.id) },
    };
    const next = [...flowNodes, ...toFlowNodes([node])];
    const nextEdges = request?.sourceId
      ? [...flowEdges, { id: crypto.randomUUID(), source: request.sourceId, target: node.id, type: "smoothstep" }]
      : flowEdges;
    setFlowNodes(next);
    setFlowEdges(nextEdges);
    setQuestionAddRequest(null);
    scheduleSave(next, nextEdges);
  }

  function saveEditedNode(updatedNode: InterviewPlanNode) {
    const next = flowNodes.map((node) => node.id === updatedNode.id
      ? { ...node, data: { planNode: updatedNode } }
      : node);
    setFlowNodes(next);
    setEditingNodeId(null);
    scheduleSave(next, flowEdges);
  }

  const actions = useMemo(() => ({
    async start(nodeId: string) {
      setMessage(null);
      try {
        const result = await startPlanNode(initialPlan.id, nodeId);
        adoptPlan(result.plan);
        if (result.launch.kind === "interview") {
          const interviewId = crypto.randomUUID();
          const link = { planId: initialPlan.id, nodeId };
          sessionStorage.setItem(`interview_plan_link_${interviewId}`, JSON.stringify(link));
          sessionStorage.setItem(`pending_interview_${interviewId}`, JSON.stringify({
            role: defaultRole || "Software Engineer",
            type: result.launch.interview_type,
            difficulty: result.launch.difficulty,
            durationMinutes: result.launch.duration_minutes,
          }));
          router.push(`/interview/${interviewId}?planId=${initialPlan.id}&nodeId=${nodeId}`);
          return;
        }
        const firstQuestionId = result.launch.question_ids[0];
        const first = questions.find((question) => question.id === firstQuestionId);
        if (!first) throw new Error("This question is no longer available.");
        router.push(`/questions/${first.slug}?planId=${initialPlan.id}&nodeId=${nodeId}`);
      } catch (cause) {
        setMessage(cause instanceof Error ? cause.message : "Could not start this step.");
      }
    },
    async skip(nodeId: string) {
      try { adoptPlan(await skipPlanNode(initialPlan.id, nodeId)); }
      catch (cause) { setMessage(cause instanceof Error ? cause.message : "Could not skip this step."); }
    },
    async complete(nodeId: string) {
      try { adoptPlan(await completePlanNode(initialPlan.id, nodeId)); }
      catch (cause) { setMessage(cause instanceof Error ? cause.message : "Could not complete this step."); }
    },
    edit(nodeId: string) {
      setEditingNodeId(nodeId);
    },
    remove(nodeId: string) {
      const nodes = flowNodes.filter((node) => node.id !== nodeId);
      const edges = flowEdges.filter((edge) => edge.source !== nodeId && edge.target !== nodeId);
      setFlowNodes(nodes);
      setFlowEdges(edges);
      scheduleSave(nodes, edges);
    },
  }), [adoptPlan, defaultRole, flowEdges, flowNodes, initialPlan.id, questions, router, scheduleSave]);

  return (
    <PlanActionsContext.Provider value={actions}>
      <div className="flex h-full min-h-0 bg-[#0C0E14]">
        <aside className="z-10 w-72 shrink-0 overflow-y-auto border-r border-white/[0.08] bg-[#101219] p-4">
          <button type="button" onClick={() => router.push("/plans")} className="inline-flex cursor-pointer items-center gap-2 text-xs text-[#8B93A7] hover:text-white"><IconArrowLeft className="h-3.5 w-3.5" />All plans</button>
          <input value={title} onChange={(event) => setTitle(event.target.value)} onBlur={() => void patchInterviewPlan(initialPlan.id, { title: title.trim() || initialPlan.title })} maxLength={120} className="mt-4 w-full border-b border-white/[0.1] bg-transparent pb-2 text-lg font-semibold text-white outline-none focus:border-[#3B82F6]" />
          <div className="mt-6 space-y-3 border-t border-white/[0.08] pt-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#6B7385]">Add mock interview</p>
            <select value={interviewType} onChange={(event) => setInterviewType(event.target.value as InterviewType)} className="h-9 w-full rounded-lg border border-white/[0.08] bg-[#171A22] px-2 text-xs text-[#E8ECF4] outline-none">{INTERVIEW_TYPE_VALUES.map((type) => <option key={type} value={type}>{INTERVIEW_TYPE_META[type].label}</option>)}</select>
            <div className="grid grid-cols-2 gap-2"><select value={duration} onChange={(event) => setDuration(Number(event.target.value) as InterviewDuration)} className="h-9 rounded-lg border border-white/[0.08] bg-[#171A22] px-2 text-xs text-[#E8ECF4] outline-none">{[15, 30, 45].map((value) => <option key={value} value={value}>{value} min</option>)}</select><select value={difficulty} onChange={(event) => setDifficulty(event.target.value as Difficulty)} className="h-9 rounded-lg border border-white/[0.08] bg-[#171A22] px-2 text-xs capitalize text-[#E8ECF4] outline-none">{["easy", "medium", "hard"].map((value) => <option key={value}>{value}</option>)}</select></div>
            <button type="button" onClick={() => addInterview()} className="inline-flex h-9 w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#3B82F6] text-xs font-semibold text-white hover:bg-[#4B8FF7]"><IconPlus className="h-3.5 w-3.5" />Add interview</button>
          </div>
          <button type="button" onClick={() => setQuestionAddRequest({ sourceId: null, position: { x: 260 + flowNodes.length * 45, y: 180 + flowNodes.length * 30 } })} className="mt-3 inline-flex h-9 w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-white/[0.1] text-xs font-medium text-[#C5CBD8] hover:bg-white/[0.05]"><IconQuestionBank className="h-3.5 w-3.5" />Add questions</button>
          <button type="button" disabled={saving} onClick={() => void save()} className="mt-6 h-10 w-full cursor-pointer rounded-lg border border-[#3B82F6]/30 bg-[#3B82F6]/10 text-sm font-semibold text-[#93C5FD] hover:bg-[#3B82F6]/15 disabled:opacity-50">{saving ? "Saving…" : "Save plan"}</button>
          {message ? <p className="mt-3 text-xs leading-relaxed text-[#A8B0C2]">{message}</p> : null}
          <p className="mt-6 text-xs leading-relaxed text-[#6B7385]">Drag from a step’s right handle to another step’s left handle. Loops are blocked.</p>
        </aside>
        <div className="min-w-0 flex-1">
          <ReactFlow
            nodes={flowNodes}
            edges={flowEdges}
            nodeTypes={nodeTypes}
            onInit={setReactFlowInstance}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onConnectEnd={onConnectEnd}
            onPaneClick={() => setQuickAddRequest(null)}
            onNodeDragStop={(_event, node) => scheduleSave(flowNodes.map((item) => item.id === node.id ? node : item), flowEdges)}
            fitView
            colorMode="dark"
            deleteKeyCode={["Backspace", "Delete"]}
          >
            <Background color="#273044" gap={22} size={1} />
            <Controls />
            <MiniMap nodeColor="#3B82F6" maskColor="rgba(9, 11, 16, 0.72)" />
          </ReactFlow>
        </div>
      </div>
      {quickAddRequest ? (
        <div
          className="fixed z-40 w-52 overflow-hidden rounded-xl border border-white/[0.12] bg-[#171A22] p-1.5 shadow-2xl"
          style={{ left: Math.min(quickAddRequest.screenPosition.x, window.innerWidth - 224), top: Math.min(quickAddRequest.screenPosition.y, window.innerHeight - 132) }}
        >
          <p className="px-2.5 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#7D889B]">Add next step</p>
          <button type="button" onClick={() => addInterview(quickAddRequest)} className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm text-[#E8ECF4] hover:bg-white/[0.06]"><IconPlus className="h-4 w-4 text-[#60A5FA]" />Mock interview</button>
          <button type="button" onClick={() => { setQuestionAddRequest(quickAddRequest); setQuickAddRequest(null); }} className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm text-[#E8ECF4] hover:bg-white/[0.06]"><IconQuestionBank className="h-4 w-4 text-[#60A5FA]" />Question set</button>
        </div>
      ) : null}
      {questionAddRequest ? <QuestionPickerModal questions={questions} onClose={() => setQuestionAddRequest(null)} onConfirm={addQuestions} /> : null}
      {editingNodeId ? (
        <EditPlanNodeModal
          node={flowNodes.find((node) => node.id === editingNodeId)!.data.planNode}
          questions={questions}
          onClose={() => setEditingNodeId(null)}
          onSave={saveEditedNode}
        />
      ) : null}
    </PlanActionsContext.Provider>
  );
}
