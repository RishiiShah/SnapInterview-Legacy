import amazonFrontendData from "@/data/interview-loops/companies/amazon-frontend.json";
import googleSweData from "@/data/interview-loops/companies/google-swe.json";
import sweFamilyData from "@/data/interview-loops/families/swe.json";
import generalData from "@/data/interview-loops/general.json";
import { inferRoleFamily, normalizeCompanyKey } from "@/data/company-packs";
import { normalizeRoleSlug } from "@/lib/rag/taxonomy";
import type { InterviewLevel } from "@/lib/interview/domain";
import type { BlueprintResolution, InterviewPlanGraph, InterviewPlanNode, InterviewPlanTarget } from "@/lib/plans/graph";
import { interviewLoopBlueprintSchema, type InterviewLoopBlueprint } from "@/data/interview-loops/schema";

const exactBlueprints = [googleSweData, amazonFrontendData].map((value) => interviewLoopBlueprintSchema.parse(value));
const familyBlueprints = [sweFamilyData].map((value) => interviewLoopBlueprintSchema.parse(value));
const generalBlueprint = interviewLoopBlueprintSchema.parse(generalData);

export type InterviewLoopResolution = {
  blueprint: InterviewLoopBlueprint;
  resolution: BlueprintResolution;
  companyKey: string;
  roleSlug: string;
  roleFamily: string;
};

export function listInterviewLoopBlueprints(): InterviewLoopBlueprint[] {
  return [...exactBlueprints, ...familyBlueprints, generalBlueprint];
}

export function resolveInterviewLoopBlueprint(input: {
  company: string;
  role: string;
  level: InterviewLevel;
  requestedKey?: string;
}): InterviewLoopResolution {
  const companyKey = normalizeCompanyKey(input.company);
  const roleSlug = normalizeRoleSlug(input.role);
  const roleFamily = inferRoleFamily(roleSlug);
  const compatible = (blueprint: InterviewLoopBlueprint) =>
    blueprint.supported_levels.includes(input.level)
    && (blueprint.company_keys.length === 0 || blueprint.company_keys.includes(companyKey))
    && (blueprint.role_slugs.length === 0 || blueprint.role_slugs.includes(roleSlug))
    && (blueprint.role_families.length === 0 || blueprint.role_families.includes(roleFamily));

  const exact = exactBlueprints.find(compatible);
  const family = familyBlueprints.find(compatible);
  const blueprint = exact ?? family ?? generalBlueprint;
  const resolution: BlueprintResolution = exact ? "exact" : family ? "role_family" : "general";

  if (input.requestedKey && input.requestedKey !== blueprint.key) {
    throw new Error(`Blueprint ${input.requestedKey} is not compatible with this target`);
  }

  return { blueprint, resolution, companyKey, roleSlug, roleFamily };
}

export function materializeInterviewLoop(input: {
  blueprint: InterviewLoopBlueprint;
  level: InterviewLevel;
}): InterviewPlanGraph {
  const nodes: InterviewPlanNode[] = input.blueprint.rounds
    .filter((round) => round.included_levels.includes(input.level))
    .map((round) => {
      const difficulty = round.difficulty_by_level[input.level];
      if (!difficulty) throw new Error(`Blueprint ${input.blueprint.key} is missing ${input.level} difficulty for ${round.round_key}`);
      return {
      id: crypto.randomUUID(),
      type: "interview" as const,
      title: round.title,
      position_x: round.position.x,
      position_y: round.position.y,
      status: "available" as const,
      config: {
        interview_type: round.interview_type,
        duration_minutes: round.duration_minutes,
        difficulty,
        round_profile: {
          round_key: round.round_key,
          stage: round.stage,
          purpose: round.purpose,
          competencies: round.competencies,
          question_strategy: round.question_strategy,
          rubric_key: round.rubric_key,
          rubric_dimensions: round.rubric_dimensions,
          context_mode: "fresh" as const,
        },
      },
      };
    });
  return { nodes, edges: [] };
}

export function buildInterviewPlanTarget(input: {
  company: string;
  role: string;
  level: InterviewLevel;
  interviewDate?: string;
  jobDescription?: string;
  resolution: InterviewLoopResolution;
}): InterviewPlanTarget {
  return {
    company: input.company,
    company_key: input.resolution.companyKey,
    role: input.role,
    role_slug: input.resolution.roleSlug,
    role_family: input.resolution.roleFamily,
    level: input.level,
    interview_date: input.interviewDate ?? null,
    job_description: input.jobDescription ?? null,
    blueprint_key: input.resolution.blueprint.key,
    blueprint_version: input.resolution.blueprint.version,
    blueprint_reviewed_at: input.resolution.blueprint.reviewed_at,
    resolution: input.resolution.resolution,
  };
}
