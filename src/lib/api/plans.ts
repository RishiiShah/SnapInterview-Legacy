import type {
  InterviewPlan,
  InterviewPlanGraph,
  InterviewPlanSummary,
  InterviewPlanTemplate,
  PlanStatus,
} from "@/lib/plans/graph";

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: init?.body
      ? { "Content-Type": "application/json", ...init.headers }
      : init?.headers,
  });
  const body = await response.json().catch(() => null) as { error?: string } | null;
  if (!response.ok) throw new Error(body?.error || `Request failed (${response.status})`);
  return body as T;
}

export async function listInterviewPlans(): Promise<InterviewPlanSummary[]> {
  return (await requestJson<{ plans: InterviewPlanSummary[] }>("/api/interview-plans")).plans;
}

export async function listInterviewPlanTemplates(): Promise<InterviewPlanTemplate[]> {
  return (await requestJson<{ templates: InterviewPlanTemplate[] }>("/api/interview-plans/templates")).templates;
}

export async function createInterviewPlan(input: { title: string; template_key?: string }): Promise<InterviewPlan> {
  return (await requestJson<{ plan: InterviewPlan }>("/api/interview-plans", {
    method: "POST",
    body: JSON.stringify(input),
  })).plan;
}

export async function getInterviewPlan(id: string): Promise<InterviewPlan> {
  return (await requestJson<{ plan: InterviewPlan }>(`/api/interview-plans/${id}`)).plan;
}

export async function patchInterviewPlan(id: string, input: { title?: string; status?: PlanStatus }): Promise<InterviewPlan> {
  return (await requestJson<{ plan: InterviewPlan }>(`/api/interview-plans/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  })).plan;
}

export async function deleteInterviewPlan(id: string): Promise<void> {
  await requestJson(`/api/interview-plans/${id}`, { method: "DELETE" });
}

export async function putInterviewPlanGraph(id: string, graph: InterviewPlanGraph): Promise<InterviewPlan> {
  return (await requestJson<{ plan: InterviewPlan }>(`/api/interview-plans/${id}/graph`, {
    method: "PUT",
    body: JSON.stringify(graph),
  })).plan;
}

export async function startPlanNode(planId: string, nodeId: string, input: { interview_id?: string } = {}) {
  return requestJson<{
    plan: InterviewPlan;
    launch: ({ kind: "interview"; interview_type: string; duration_minutes: 15 | 30 | 45; difficulty: string })
      | ({ kind: "question_set"; question_ids: number[] });
  }>(`/api/interview-plans/${planId}/nodes/${nodeId}/start`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function completePlanNode(planId: string, nodeId: string, input: { score?: number } = {}): Promise<InterviewPlan> {
  return (await requestJson<{ plan: InterviewPlan }>(`/api/interview-plans/${planId}/nodes/${nodeId}/complete`, {
    method: "POST",
    body: JSON.stringify(input),
  })).plan;
}

export async function skipPlanNode(planId: string, nodeId: string): Promise<InterviewPlan> {
  return (await requestJson<{ plan: InterviewPlan }>(`/api/interview-plans/${planId}/nodes/${nodeId}/skip`, {
    method: "POST",
    body: "{}",
  })).plan;
}
