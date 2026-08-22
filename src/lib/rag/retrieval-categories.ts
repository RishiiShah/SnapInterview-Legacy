/**
 * Maps interview context + technical terms onto corpus category preferences
 * so hybrid/rerank stay on-topic for large multi-domain corpora.
 */

/** Term → preferred QuestionCorpus.category labels (software + HR). */
export const TERM_CATEGORY_HINTS: Record<string, string[]> = {
  // Backend / distributed
  kafka: ["Distributed Systems", "System Design"],
  redis: ["Distributed Systems", "Database and SQL", "System Design"],
  redlock: ["Distributed Systems", "Database and SQL"],
  postgres: ["Database and SQL", "System Design"],
  postgresql: ["Database and SQL", "System Design"],
  sql: ["Database and SQL"],
  database: ["Database and SQL", "System Design"],
  transaction: ["Database and SQL", "Distributed Systems"],
  consistency: ["Distributed Systems", "Database and SQL", "System Design"],
  idempotency: ["Distributed Systems", "System Design"],
  lock: ["Distributed Systems", "Database and SQL"],
  mutex: ["Distributed Systems"],
  quorum: ["Distributed Systems", "System Design"],
  replication: ["Distributed Systems", "Database and SQL"],
  shard: ["Distributed Systems", "Database and SQL", "System Design"],
  sharding: ["Distributed Systems", "Database and SQL", "System Design"],
  cache: ["Distributed Systems", "System Design", "Database and SQL"],
  message: ["Distributed Systems", "System Design"],
  queue: ["Distributed Systems", "System Design"],
  grpc: ["System Design", "Distributed Systems"],
  microservice: ["System Design", "Distributed Systems"],
  microservices: ["System Design", "Distributed Systems"],
  scale: ["System Design", "Distributed Systems"],
  // Frontend
  react: ["Front-end", "Web Development", "Languages and Frameworks"],
  nextjs: ["Front-end", "Web Development"],
  "next.js": ["Front-end", "Web Development"],
  redux: ["Front-end", "Web Development"],
  virtualization: ["Front-end", "Web Development"],
  virtual: ["Front-end", "Web Development"],
  memo: ["Front-end", "Web Development"],
  // DevOps
  kubernetes: ["DevOps", "Cloud and Architecture", "Infrastructure"],
  k8s: ["DevOps", "Cloud and Architecture", "Infrastructure"],
  docker: ["DevOps", "Cloud and Architecture", "Infrastructure"],
  terraform: ["DevOps", "Cloud and Architecture", "Infrastructure"],
  prometheus: ["DevOps", "Cloud and Architecture"],
  helm: ["DevOps", "Cloud and Architecture"],
  argo: ["DevOps", "Cloud and Architecture"],
  deploy: ["DevOps", "Cloud and Architecture"],
  // Algorithms
  trie: ["Data Structures and Algorithms", "Algorithms", "Computer Science Fundamentals"],
  heap: ["Data Structures and Algorithms", "Algorithms"],
  graph: ["Data Structures and Algorithms", "Algorithms"],
  tree: ["Data Structures and Algorithms", "Algorithms"],
  algorithm: ["Data Structures and Algorithms", "Algorithms", "Computer Science Fundamentals"],
  sorting: ["Data Structures and Algorithms", "Algorithms"],
  // Behavioral
  conflict: ["Conflict Resolution", "Leadership", "Team Collaboration"],
  leadership: ["Leadership", "Team Collaboration"],
  stakeholder: ["Leadership", "Communication", "Team Collaboration"],
  collaboration: ["Team Collaboration", "Work Style"],
};

const TYPE_CATEGORY_DEFAULTS: Record<string, string[]> = {
  "system-design": ["System Design", "Distributed Systems", "Database and SQL"],
  "coding-algorithms": [
    "Data Structures and Algorithms",
    "Algorithms",
    "Computer Science Fundamentals",
    "General Programming",
  ],
  "behavioral-leadership": [
    "Conflict Resolution",
    "Leadership",
    "Team Collaboration",
    "Adaptability",
    "Work Style",
    "Career Goals",
    "Communication",
  ],
  "recruiter-screen": ["Career Goals", "Work Style", "Communication"],
  "hiring-manager": ["Leadership", "Team Collaboration", "Career Goals", "Work Style"],
  "bar-raiser": ["Leadership", "Conflict Resolution", "System Design", "Distributed Systems"],
};

/**
 * Builds an ordered list of preferred corpus categories from interview type,
 * focus/pillar text, and technical terms present in the retrieval query.
 */
export function inferPreferredCategories(input: {
  interviewType: string;
  focusAreas?: string;
  activePillar?: string;
  technicalTerms?: string[];
  limit?: number;
}): string[] {
  const limit = input.limit ?? 8;
  const ranked = new Map<string, number>();

  const bump = (category: string, weight: number) => {
    ranked.set(category, (ranked.get(category) ?? 0) + weight);
  };

  for (const category of TYPE_CATEGORY_DEFAULTS[input.interviewType] ?? []) {
    bump(category, 1);
  }

  const contextual = [input.focusAreas, input.activePillar]
    .filter(Boolean)
    .flatMap((value) => String(value).split(/[,/|]/))
    .map((value) => value.trim())
    .filter((value) => value.length > 2);

  for (const label of contextual) {
    bump(label, 2);
    const lower = label.toLowerCase();
    for (const [term, categories] of Object.entries(TERM_CATEGORY_HINTS)) {
      if (lower.includes(term)) {
        for (const category of categories) bump(category, 2);
      }
    }
  }

  for (const rawTerm of input.technicalTerms ?? []) {
    const term = rawTerm.trim().toLowerCase();
    if (!term) continue;
    const categories = TERM_CATEGORY_HINTS[term];
    if (categories) {
      for (const category of categories) bump(category, 3);
    }
  }

  return [...ranked.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([category]) => category)
    .slice(0, limit);
}

/**
 * True when a candidate category is aligned with the preferred set
 * (exact match or shared significant token).
 */
export function categoryMatchesPreferred(
  candidateCategory: string,
  preferredCategories: string[]
): "exact" | "soft" | "none" {
  if (preferredCategories.length === 0) return "none";
  const categoryLower = candidateCategory.toLowerCase();
  const preferredLower = preferredCategories.map((c) => c.toLowerCase());
  if (preferredLower.includes(categoryLower)) return "exact";

  const catTokens = categoryLower.split(/[^a-z0-9]+/).filter((t) => t.length > 2);
  const preferredTokens = preferredLower.flatMap((pref) =>
    pref.split(/[^a-z0-9]+/).filter((t) => t.length > 2)
  );

  const softHit = catTokens.some((token) =>
    preferredTokens.some(
      (prefToken) =>
        prefToken === token ||
        (prefToken.length > 3 && token.includes(prefToken)) ||
        (token.length > 3 && prefToken.includes(token))
    )
  );
  return softHit ? "soft" : "none";
}
