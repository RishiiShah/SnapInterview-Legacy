import type { InterviewPlanNode, InterviewPlanTemplate } from "@/lib/plans/graph";

type InterviewSeed = Pick<InterviewPlanNode, "title" | "position_x" | "position_y" | "config">;

const templateDefinitions: Array<{
  key: string;
  title: string;
  description: string;
  interviews: InterviewSeed[];
}> = [
  {
    key: "company-loop",
    title: "Company loop",
    description: "Prepare for a complete technical hiring loop.",
    interviews: [
      { title: "Recruiter screen", position_x: 80, position_y: 180, config: { interview_type: "recruiter-screen", duration_minutes: 30, difficulty: "medium" } },
      { title: "Coding interview", position_x: 380, position_y: 180, config: { interview_type: "coding-algorithms", duration_minutes: 45, difficulty: "medium" } },
      { title: "System design", position_x: 680, position_y: 180, config: { interview_type: "system-design", duration_minutes: 45, difficulty: "medium" } },
      { title: "Behavioral interview", position_x: 980, position_y: 180, config: { interview_type: "behavioral-leadership", duration_minutes: 30, difficulty: "medium" } },
    ],
  },
  {
    key: "coding-focus",
    title: "Coding focus",
    description: "Diagnose your baseline, then complete a full coding mock.",
    interviews: [
      { title: "Coding diagnostic", position_x: 180, position_y: 180, config: { interview_type: "coding-algorithms", duration_minutes: 15, difficulty: "medium" } },
      { title: "Coding mock", position_x: 520, position_y: 180, config: { interview_type: "coding-algorithms", duration_minutes: 45, difficulty: "hard" } },
    ],
  },
  {
    key: "system-design-focus",
    title: "System design focus",
    description: "Build confidence before a longer system-design session.",
    interviews: [
      { title: "System design foundations", position_x: 180, position_y: 180, config: { interview_type: "system-design", duration_minutes: 30, difficulty: "medium" } },
      { title: "System design mock", position_x: 520, position_y: 180, config: { interview_type: "system-design", duration_minutes: 45, difficulty: "hard" } },
    ],
  },
];

export function listPlanTemplates(): InterviewPlanTemplate[] {
  return templateDefinitions.map((template) => {
    const nodes: InterviewPlanNode[] = template.interviews.map((interview) => ({
      ...interview,
      id: crypto.randomUUID(),
      type: "interview",
      status: "locked",
    }));
    const edges = nodes.slice(1).map((node, index) => ({
      id: crypto.randomUUID(),
      source_node_id: nodes[index].id,
      target_node_id: node.id,
    }));
    return { ...template, nodes, edges };
  });
}

export function getPlanTemplate(key: string): InterviewPlanTemplate | null {
  return listPlanTemplates().find((template) => template.key === key) ?? null;
}
