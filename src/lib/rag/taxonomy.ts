import type { InterviewType } from "@/lib/interview/domain";

/**
 * Maps source-dataset categories onto the role packs in `src/data/prompts/roles/`
 * and the interview types in `INTERVIEW_TYPE_VALUES`.
 *
 * Roles are deliberately many-per-question. A REST API question serves backend,
 * full-stack and node-js candidates alike, and with a corpus this small,
 * one-role-per-question would strand most of it. `roleTags` is a boost signal
 * during retrieval, never a hard filter — vector similarity still surfaces a
 * sensible question for a role nobody thought to map.
 */

/** Canonical spellings for source categories that arrive dirty. */
const CATEGORY_ALIASES: Record<string, string> = {
  // Single-row typo in the software CSV.
  "General Program": "General Programming",
  // Two labels, one topic.
  "Database Systems": "Database and SQL",
};

export function normalizeCategory(category: string): string {
  const trimmed = category.trim();
  return CATEGORY_ALIASES[trimmed] ?? trimmed;
}

const BACKEND_ROLES = [
  "software-engineer-backend",
  "software-engineer-systems-infrastructure",
  "software-engineer-full-stack",
  "backend-developer",
  "node-js-developer",
  "java-developer",
  "python-developer",
  "go-developer",
  "rust-developer",
  "full-stack-developer",
];

const FRONTEND_ROLES = [
  "software-engineer-frontend",
  "software-engineer-full-stack",
  "design-engineer",
  "frontend-developer",
  "react-developer",
  "angular-developer",
  "vue-developer",
  "full-stack-developer",
];

const MOBILE_ROLES = [
  "software-engineer-mobile-ios-android",
  "software-engineer-ios",
  "software-engineer-android",
  "mobile-developer",
];

const CLOUD_SRE_ROLES = [
  "site-reliability-engineer-sre",
  "devops-cloud-engineer",
  "platform-infrastructure-engineer",
  "devops-engineer",
  "cloud-architect",
  "system-administrator",
  "solutions-architect",
];

const DATA_AI_ROLES = [
  "machine-learning-engineer",
  "ai-llm-applications-engineer",
  "data-engineer",
  "data-scientist",
  "analytics-engineer",
  "ai-research-scientist",
];

const QUANT_ROLES = [
  "quantitative-developer",
  "quantitative-researcher",
  "quantitative-trader",
];

const ARCHITECT_ROLES = [
  "solutions-architect",
  "cloud-architect",
  "tech-lead-staff-engineer",
  "tech-lead",
  "engineering-manager",
];

const ALL_ENGINEERING = [
  ...new Set([
    "software-engineer",
    "software-engineer-in-test-sdet",
    "software-engineer-embedded-firmware",
    "qa-engineer",
    ...BACKEND_ROLES,
    ...FRONTEND_ROLES,
    ...MOBILE_ROLES,
    ...CLOUD_SRE_ROLES,
    ...DATA_AI_ROLES,
    ...QUANT_ROLES,
  ]),
];

interface CategoryMapping {
  types: InterviewType[];
  roleTags: string[];
}

const SOFTWARE_CATEGORY_MAP: Record<string, CategoryMapping> = {
  "System Design": { types: ["system-design", "domain-role"], roleTags: [...ARCHITECT_ROLES, ...BACKEND_ROLES, ...CLOUD_SRE_ROLES] },
  "Distributed Systems": { types: ["system-design", "domain-role"], roleTags: [...ARCHITECT_ROLES, ...BACKEND_ROLES, ...DATA_AI_ROLES, ...CLOUD_SRE_ROLES] },
  DevOps: { types: ["domain-role", "system-design"], roleTags: CLOUD_SRE_ROLES },
  "Front-end": { types: ["domain-role"], roleTags: FRONTEND_ROLES },
  "Back-end": { types: ["domain-role"], roleTags: BACKEND_ROLES },
  "Full-stack": { types: ["domain-role"], roleTags: ["software-engineer-full-stack", "full-stack-developer", ...BACKEND_ROLES, ...FRONTEND_ROLES] },
  "Web Development": { types: ["domain-role"], roleTags: [...FRONTEND_ROLES, "software-engineer-full-stack", "full-stack-developer"] },
  Security: { types: ["domain-role", "system-design"], roleTags: ["security-engineer", ...BACKEND_ROLES, ...CLOUD_SRE_ROLES] },
  "Data Structures": { types: ["coding-algorithms", "domain-role"], roleTags: ALL_ENGINEERING },
  Algorithms: { types: ["coding-algorithms", "domain-role"], roleTags: ALL_ENGINEERING },
  "Languages and Frameworks": { types: ["domain-role"], roleTags: ALL_ENGINEERING },
  "General Programming": { types: ["domain-role"], roleTags: ALL_ENGINEERING },
  "Database and SQL": { types: ["domain-role"], roleTags: [...BACKEND_ROLES, ...DATA_AI_ROLES] },
  "Data Engineering": { types: ["domain-role", "system-design"], roleTags: DATA_AI_ROLES },
  "Machine Learning": { types: ["domain-role"], roleTags: DATA_AI_ROLES },
  "Artificial Intelligence": { types: ["domain-role"], roleTags: DATA_AI_ROLES },
  "Software Testing": { types: ["domain-role"], roleTags: ["software-engineer-in-test-sdet", "qa-engineer", ...ALL_ENGINEERING] },
  "Version Control": { types: ["domain-role"], roleTags: ALL_ENGINEERING },
  Networking: { types: ["domain-role", "system-design"], roleTags: [...CLOUD_SRE_ROLES, "security-engineer"] },
  "Low-level Systems": { types: ["domain-role"], roleTags: ["software-engineer-systems-infrastructure", "software-engineer-embedded-firmware", "go-developer", "rust-developer", ...QUANT_ROLES] },
};

export function mapSoftwareCategory(category: string): CategoryMapping {
  const normalized = normalizeCategory(category);
  // An unmapped category is still ingestible — vector similarity carries it.
  // Tagging it domain-role with no roles keeps it retrievable rather than dead.
  return SOFTWARE_CATEGORY_MAP[normalized] ?? { types: ["domain-role"], roleTags: [] };
}

/**
 * The eight HR categories. `roleTags` is intentionally empty for all of them:
 * behavioural questions are genuinely role-agnostic, and the source dataset's
 * own `role` labels were verified to be randomly assigned (every question
 * appeared under all 8 roles), so they carry no information to preserve.
 */
const HR_CATEGORY_MAP: Record<string, InterviewType[]> = {
  Leadership: ["behavioral-leadership", "hiring-manager"],
  Adaptability: ["behavioral-leadership"],
  "Culture Fit": ["behavioral-leadership", "recruiter-screen"],
  Motivation: ["behavioral-leadership", "recruiter-screen"],
  "Work Style": ["behavioral-leadership"],
  "Team Collaboration": ["behavioral-leadership"],
  "Career Goals": ["behavioral-leadership", "recruiter-screen"],
  "Conflict Resolution": ["behavioral-leadership", "hiring-manager"],
};

export const HR_CATEGORIES = Object.keys(HR_CATEGORY_MAP);

export function mapHrCategory(category: string): CategoryMapping {
  return { types: HR_CATEGORY_MAP[category.trim()] ?? ["behavioral-leadership"], roleTags: [] };
}

/**
 * Turns a display role ("Software Engineer - Backend") into the slug used by `roleTags`
 * and the role packs in `src/data/prompts/roles/` ("software-engineer-backend").
 * Mirrors the normalization in `src/lib/interview/prompts.ts`.
 */
export function normalizeRoleSlug(role: string): string {
  return role
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export const CORPUS_SOURCES = {
  software: "software-questions-csv",
  hr: "hr-dataset-40",
} as const;
