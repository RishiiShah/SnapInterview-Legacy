import { z } from "zod/v4";

import { apiJson, badRequestError, unauthorizedError } from "@/lib/api-response";
import { INTERVIEW_LEVEL_VALUES } from "@/lib/interview/domain";
import { getSessionUserIdentity } from "@/lib/server-auth";
import { materializeInterviewLoop, resolveInterviewLoopBlueprint } from "@/data/interview-loops";
import type { InterviewNodeConfig } from "@/lib/plans/graph";

const querySchema = z.object({
  company: z.string().trim().min(1).max(200),
  role: z.string().trim().min(1).max(200),
  level: z.enum(INTERVIEW_LEVEL_VALUES),
});

export async function GET(request: Request) {
  if (!await getSessionUserIdentity()) return unauthorizedError();
  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    company: url.searchParams.get("company"),
    role: url.searchParams.get("role"),
    level: url.searchParams.get("level"),
  });
  if (!parsed.success) return badRequestError("Company, role, and level are required");

  const resolution = resolveInterviewLoopBlueprint(parsed.data);
  const graph = materializeInterviewLoop({ blueprint: resolution.blueprint, level: parsed.data.level });
  return apiJson({
    blueprint: {
      key: resolution.blueprint.key,
      version: resolution.blueprint.version,
      title: resolution.blueprint.title,
      description: resolution.blueprint.description,
      reviewed_at: resolution.blueprint.reviewed_at,
      sources_note: resolution.blueprint.sources_note,
      resolution: resolution.resolution,
      rounds: graph.nodes.map((node) => {
        const config = node.config as InterviewNodeConfig;
        return {
          round_key: config.round_profile?.round_key ?? node.id,
          title: node.title,
          interview_type: config.interview_type,
          duration_minutes: config.duration_minutes,
          difficulty: config.difficulty,
          purpose: config.round_profile?.purpose ?? node.title,
          competencies: config.round_profile?.competencies ?? [],
        };
      }),
    },
  });
}
