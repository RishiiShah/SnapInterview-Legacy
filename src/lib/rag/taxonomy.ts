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

const BACKEND_ROLES = ["backend-developer", "node-js-developer", "java-developer", "python-developer", "go-developer", "rust-developer", "full-stack-developer"];
const FRONTEND_ROLES = ["frontend-developer", "react-developer", "angular-developer", "vue-developer", "full-stack-developer"];
const ARCHITECT_ROLES = ["solutions-architect", "cloud-architect", "tech-lead", "engineering-manager"];
const DATA_ROLES = ["data-engineer", "data-scientist", "machine-learning-engineer"];
const ALL_ENGINEERING = [...new Set([...BACKEND_ROLES, ...FRONTEND_ROLES, "mobile-developer", "qa-engineer", "devops-engineer"])];

interface CategoryMapping {
  types: InterviewType[];
  roleTags: string[];
}

const SOFTWARE_CATEGORY_MAP: Record<string, CategoryMapping> = {
  "System Design": { types: ["system-design", "technical"], roleTags: [...ARCHITECT_ROLES, ...BACKEND_ROLES] },
  "Distributed Systems": { types: ["system-design", "technical"], roleTags: [...ARCHITECT_ROLES, ...BACKEND_ROLES, "data-engineer"] },
  DevOps: { types: ["technical", "system-design"], roleTags: ["devops-engineer", "cloud-architect", "system-administrator", "solutions-architect"] },
  "Front-end": { types: ["technical"], roleTags: FRONTEND_ROLES },
  "Back-end": { types: ["technical"], roleTags: BACKEND_ROLES },
  "Full-stack": { types: ["technical"], roleTags: ["full-stack-developer", ...BACKEND_ROLES, ...FRONTEND_ROLES] },
  "Web Development": { types: ["technical"], roleTags: [...FRONTEND_ROLES, "full-stack-developer"] },
  Security: { types: ["technical", "system-design"], roleTags: ["security-engineer", ...BACKEND_ROLES, "devops-engineer"] },
  "Data Structures": { types: ["coding", "technical"], roleTags: ALL_ENGINEERING },
  Algorithms: { types: ["coding", "technical"], roleTags: ALL_ENGINEERING },
  "Languages and Frameworks": { types: ["technical"], roleTags: ALL_ENGINEERING },
  "General Programming": { types: ["technical"], roleTags: ALL_ENGINEERING },
  "Database and SQL": { types: ["technical"], roleTags: [...BACKEND_ROLES, ...DATA_ROLES] },
  "Data Engineering": { types: ["technical", "system-design"], roleTags: DATA_ROLES },
  "Machine Learning": { types: ["technical"], roleTags: ["machine-learning-engineer", "data-scientist"] },
  "Artificial Intelligence": { types: ["technical"], roleTags: ["machine-learning-engineer", "data-scientist"] },
  "Software Testing": { types: ["technical"], roleTags: ["qa-engineer", ...ALL_ENGINEERING] },
  "Version Control": { types: ["technical"], roleTags: ALL_ENGINEERING },
  Networking: { types: ["technical", "system-design"], roleTags: ["devops-engineer", "cloud-architect", "system-administrator", "security-engineer"] },
  "Low-level Systems": { types: ["technical"], roleTags: ["go-developer", "rust-developer", "system-administrator"] },
};

export function mapSoftwareCategory(category: string): CategoryMapping {
  const normalized = normalizeCategory(category);
  // An unmapped category is still ingestible — vector similarity carries it.
  // Tagging it `technical` with no roles keeps it retrievable rather than dead.
  return SOFTWARE_CATEGORY_MAP[normalized] ?? { types: ["technical"], roleTags: [] };
}

/**
 * The eight HR categories. `roleTags` is intentionally empty for all of them:
 * behavioural questions are genuinely role-agnostic, and the source dataset's
 * own `role` labels were verified to be randomly assigned (every question
 * appeared under all 8 roles), so they carry no information to preserve.
 */
const HR_CATEGORY_MAP: Record<string, InterviewType[]> = {
  Leadership: ["leadership", "behavioral"],
  Adaptability: ["behavioral"],
  "Culture Fit": ["behavioral"],
  Motivation: ["behavioral"],
  "Work Style": ["behavioral"],
  "Team Collaboration": ["behavioral"],
  "Career Goals": ["behavioral"],
  "Conflict Resolution": ["behavioral", "leadership"],
};

export const HR_CATEGORIES = Object.keys(HR_CATEGORY_MAP);

export function mapHrCategory(category: string): CategoryMapping {
  return { types: HR_CATEGORY_MAP[category.trim()] ?? ["behavioral"], roleTags: [] };
}

/**
 * Turns a display role ("Frontend Developer") into the slug used by `roleTags`
 * and the role packs in `src/data/prompts/roles/` ("frontend-developer").
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
