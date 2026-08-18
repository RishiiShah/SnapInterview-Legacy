import type { Difficulty, InterviewPersona, InterviewType } from "./domain";
import { normalizeRoleSlug } from "@/lib/rag/taxonomy";
import { resolveCompanyPack } from "@/data/company-packs";
import { chunkResumeSemantic, chunkJobDescription } from "@/lib/rag/chunker";

export type CandidateRole = {
  title: string;
  org?: string;
  date?: string;
  bullets: string[];
};

export type CandidateProject = {
  name: string;
  stack?: string[];
  bullets: string[];
  metrics?: string[];
};

export type AgendaPillarSource = "resume" | "project" | "jd" | "role" | "company_theme" | "fundamentals";

export type AgendaPillar = {
  id: string;
  title: string;
  source: AgendaPillarSource;
  targetMinutes: number;
};

export type InterviewBrief = {
  version: 1;
  candidate: {
    mode: "experienced" | "new_grad" | "unknown";
    recentRoles: CandidateRole[];
    projects: CandidateProject[];
    stack: string[];
    notes?: string;
  };
  job: {
    present: boolean;
    requirements: string[];
  };
  company: {
    key: string;
    packId: string;
    methodSummary: string;
    levelSignals: string[];
    roleFamilySignals: string[];
    frequentThemes: string[];
  };
  profile: {
    role: string;
    roleSlug: string;
    type: InterviewType;
    difficulty: Difficulty;
    durationMinutes: 15 | 30 | 45;
    level: string;
    goal: string;
    persona: InterviewPersona;
  };
  agenda: {
    pillars: AgendaPillar[];
    openingDirective: string;
    closingDirective: string;
  };
};

export type BuildInterviewBriefInput = {
  role: string;
  company?: string | null;
  type: InterviewType;
  difficulty: Difficulty;
  durationMinutes?: number;
  persona?: InterviewPersona | null;
  onboardingLevel?: string | null;
  onboardingGoal?: string | null;
  jobDescription?: string | null;
  resumeText?: string | null;
};

/**
 * Extracts technical stack terms from resume text or chunks.
 */
function extractStackTerms(resumeText: string): string[] {
  const commonTech = [
    "TypeScript", "JavaScript", "Python", "Go", "Golang", "Rust", "Java", "C++", "C#", "Ruby",
    "React", "Next.js", "Vue", "Angular", "Node.js", "Express", "FastAPI", "Django", "Spring Boot",
    "PostgreSQL", "MySQL", "MongoDB", "Redis", "Elasticsearch", "DynamoDB", "Kafka", "RabbitMQ", "SQS",
    "AWS", "GCP", "Azure", "Docker", "Kubernetes", "Terraform", "GraphQL", "gRPC", "REST"
  ];
  const found = new Set<string>();
  const lower = resumeText.toLowerCase();

  for (const tech of commonTech) {
    const escaped = tech.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(`\\b${escaped}\\b`, "i");
    if (pattern.test(lower)) {
      found.add(tech);
    }
  }

  return Array.from(found).slice(0, 12);
}

/**
 * Parses candidate roles and projects deterministically from semantic resume chunks.
 */
function parseCandidateSections(resumeText: string | null | undefined): {
  recentRoles: CandidateRole[];
  projects: CandidateProject[];
  stack: string[];
  hasEmployment: boolean;
  hasProjectsOrEducation: boolean;
  notes?: string;
} {
  if (!resumeText || !resumeText.trim()) {
    return {
      recentRoles: [],
      projects: [],
      stack: [],
      hasEmployment: false,
      hasProjectsOrEducation: false,
      notes: "No resume provided.",
    };
  }

  const stack = extractStackTerms(resumeText);
  const roles: CandidateRole[] = [];
  const projects: CandidateProject[] = [];
  let hasEmployment = false;
  let hasProjectsOrEducation = false;

  const lines = resumeText.split(/\r?\n/);
  let currentSection = "general";
  let currentRoleOrProject: { title: string; bullets: string[] } | null = null;

  const flushCurrent = () => {
    if (!currentRoleOrProject) return;
    if (currentSection === "experience") {
      roles.push({
        title: currentRoleOrProject.title,
        bullets: currentRoleOrProject.bullets.slice(0, 3),
      });
      hasEmployment = true;
    } else if (currentSection === "projects") {
      projects.push({
        name: currentRoleOrProject.title,
        bullets: currentRoleOrProject.bullets.slice(0, 3),
      });
      hasProjectsOrEducation = true;
    }
    currentRoleOrProject = null;
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    if (line.startsWith("#")) {
      flushCurrent();
      const lower = line.toLowerCase();
      if (lower.includes("experience") || lower.includes("employment") || lower.includes("work history")) {
        currentSection = "experience";
        hasEmployment = true;
      } else if (lower.includes("project")) {
        currentSection = "projects";
        hasProjectsOrEducation = true;
      } else if (lower.includes("education") || lower.includes("coursework") || lower.includes("academic")) {
        currentSection = "education";
        hasProjectsOrEducation = true;
      } else if (lower.includes("skill")) {
        currentSection = "skills";
      } else {
        currentSection = "other";
      }
      continue;
    }

    if (currentSection === "experience" || currentSection === "projects") {
      if (line.startsWith("- ") || line.startsWith("* ")) {
        const bullet = line.replace(/^[-*]\s*/, "");
        if (currentRoleOrProject) {
          currentRoleOrProject.bullets.push(bullet);
        } else {
          currentRoleOrProject = { title: bullet, bullets: [] };
        }
      } else {
        flushCurrent();
        const periodIdx = line.indexOf(". ");
        if (periodIdx > 5 && periodIdx < 60) {
          const title = line.slice(0, periodIdx).trim();
          const rest = line.slice(periodIdx + 2).trim();
          currentRoleOrProject = { title, bullets: [rest] };
        } else {
          currentRoleOrProject = { title: line, bullets: [] };
        }
      }
    } else if (currentSection === "education") {
      hasProjectsOrEducation = true;
    }
  }
  flushCurrent();

  // Fallback to semantic chunker if raw lines didn't capture roles/projects
  if (roles.length === 0 && projects.length === 0) {
    const chunks = chunkResumeSemantic(resumeText);
    for (const chunk of chunks) {
      if (chunk.section === "experience") {
        hasEmployment = true;
        roles.push({
          title: chunk.title || "Engineering Experience",
          bullets: chunk.text.split(". ").filter((s) => s.trim().length > 5).slice(0, 3),
        });
      } else if (chunk.section === "projects") {
        hasProjectsOrEducation = true;
        projects.push({
          name: chunk.title || `Project ${projects.length + 1}`,
          bullets: chunk.text.split(". ").filter((s) => s.trim().length > 5).slice(0, 3),
        });
      } else if ((chunk.section as string) === "education") {
        hasProjectsOrEducation = true;
      }
    }
  }

  return {
    recentRoles: roles.slice(0, 2),
    projects: projects.slice(0, 3),
    stack: stack.slice(0, 12),
    hasEmployment: hasEmployment || roles.length > 0,
    hasProjectsOrEducation: hasProjectsOrEducation || projects.length > 0,
  };
}

/**
 * Parses job requirements deterministically from JD text.
 */
function parseJobRequirements(jobDescription: string | null | undefined): {
  present: boolean;
  requirements: string[];
} {
  if (!jobDescription || !jobDescription.trim()) {
    return { present: false, requirements: [] };
  }

  const jdChunks = chunkJobDescription(jobDescription);
  const reqs: string[] = [];

  for (const chunk of jdChunks) {
    const sentences = chunk.text.split(/[.\n]/).map((s) => s.trim()).filter((s) => s.length > 15);
    for (const s of sentences) {
      if (reqs.length < 8 && !reqs.includes(s)) {
        reqs.push(s);
      }
    }
  }

  return {
    present: true,
    requirements: reqs.slice(0, 8),
  };
}

/**
 * Builds 2-4 agenda pillars matching the target interview duration.
 */
function synthesizeAgendaPillars(
  mode: "experienced" | "new_grad" | "unknown",
  roles: CandidateRole[],
  projects: CandidateProject[],
  reqs: string[],
  roleSlug: string,
  interviewType: InterviewType,
  durationMinutes: 15 | 30 | 45
): AgendaPillar[] {
  const pillars: AgendaPillar[] = [];
  const is15m = durationMinutes === 15;
  const pillarCount = is15m ? 2 : durationMinutes === 30 ? 3 : 4;
  const targetPerPillar = Math.round((durationMinutes * 0.85) / pillarCount);

  // Pillar 1: Opener (Candidate project or experience)
  if (mode === "new_grad" && projects.length > 0) {
    pillars.push({
      id: "pillar-1",
      title: `Project Architecture: ${projects[0].name}`,
      source: "project",
      targetMinutes: targetPerPillar,
    });
  } else if (roles.length > 0) {
    pillars.push({
      id: "pillar-1",
      title: `Core Experience & Impact: ${roles[0].title}`,
      source: "resume",
      targetMinutes: targetPerPillar,
    });
  } else if (projects.length > 0) {
    pillars.push({
      id: "pillar-1",
      title: `Key Technical Project: ${projects[0].name}`,
      source: "project",
      targetMinutes: targetPerPillar,
    });
  } else {
    pillars.push({
      id: "pillar-1",
      title: "Core Domain Fundamentals & Engineering Baseline",
      source: "fundamentals",
      targetMinutes: targetPerPillar,
    });
  }

  // Pillar 2: Technical Depth / System Design / Role specific
  if (interviewType === "system-design") {
    pillars.push({
      id: "pillar-2",
      title: mode === "new_grad" && projects.length > 0
        ? `System Architecture & Data Flow: ${projects[0].name}`
        : "Scalable Architecture, Data Partitioning & Reliability",
      source: mode === "new_grad" && projects.length > 0 ? "project" : "role",
      targetMinutes: targetPerPillar,
    });
  } else if (interviewType === "coding-algorithms") {
    pillars.push({
      id: "pillar-2",
      title: "Data Structure Efficiency, Edge Cases & Complexity",
      source: "role",
      targetMinutes: targetPerPillar,
    });
  } else if (interviewType === "behavioral-leadership" || interviewType === "hiring-manager" || interviewType === "bar-raiser") {
    pillars.push({
      id: "pillar-2",
      title: mode === "new_grad"
        ? "Collaboration, Overcoming Blockers & Learning from Failure"
        : "Technical Ownership, Cross-Functional Conflict & Trade-offs",
      source: "company_theme",
      targetMinutes: targetPerPillar,
    });
  } else if (reqs.length > 0) {
    pillars.push({
      id: "pillar-2",
      title: `Target Role Requirements: ${reqs[0].slice(0, 45)}...`,
      source: "jd",
      targetMinutes: targetPerPillar,
    });
  } else {
    pillars.push({
      id: "pillar-2",
      title: "Design Patterns, Failure Modes & Edge Cases",
      source: "role",
      targetMinutes: targetPerPillar,
    });
  }

  // Pillar 3 (for 30m / 45m)
  if (pillarCount >= 3) {
    if (projects.length > 1) {
      pillars.push({
        id: "pillar-3",
        title: `Secondary Deep Dive: ${projects[1].name}`,
        source: "project",
        targetMinutes: targetPerPillar,
      });
    } else if (roles.length > 1) {
      pillars.push({
        id: "pillar-3",
        title: `Prior Technical Experience: ${roles[1].title}`,
        source: "resume",
        targetMinutes: targetPerPillar,
      });
    } else {
      pillars.push({
        id: "pillar-3",
        title: "Operational Rigor, Monitoring & Concurrency",
        source: "fundamentals",
        targetMinutes: targetPerPillar,
      });
    }
  }

  // Pillar 4 (for 45m)
  if (pillarCount >= 4) {
    pillars.push({
      id: "pillar-4",
      title: "Edge Cases, Scaling Stress Tests & Observability",
      source: "role",
      targetMinutes: targetPerPillar,
    });
  }

  return pillars.slice(0, 4);
}

/**
 * Builds the canonical InterviewBrief deterministically at session start.
 */
export async function buildInterviewBrief(input: BuildInterviewBriefInput): Promise<InterviewBrief> {
  const roleSlug = normalizeRoleSlug(input.role);
  const validDuration: 15 | 30 | 45 =
    input.durationMinutes === 15 || input.durationMinutes === 45 ? input.durationMinutes : 30;
  const level = input.onboardingLevel ?? (input.difficulty === "easy" ? "entry-level" : input.difficulty === "hard" ? "senior" : "mid-level");
  const goal = input.onboardingGoal ?? "unknown";
  const persona: InterviewPersona = input.persona ?? "balanced";

  // 1. Candidate Sections & Mode Detection
  const candidateData = parseCandidateSections(input.resumeText);
  const isEntryLevel = level === "entry-level" || input.difficulty === "easy";
  const isLandFirstRole = goal === "land-first-role";

  let mode: "experienced" | "new_grad" | "unknown" = "unknown";

  if (!input.resumeText || !input.resumeText.trim()) {
    mode = isEntryLevel || isLandFirstRole ? "new_grad" : "unknown";
  } else if (!candidateData.hasEmployment && candidateData.hasProjectsOrEducation) {
    mode = "new_grad";
  } else if (isEntryLevel || isLandFirstRole) {
    // Conflict rule: if land-first-role but resume shows employment, prioritize experienced probing
    if (candidateData.recentRoles.length >= 2) {
      mode = "experienced";
    } else {
      mode = "new_grad";
    }
  } else {
    mode = candidateData.hasEmployment ? "experienced" : "unknown";
  }

  // 2. Job requirements
  const jobData = parseJobRequirements(input.jobDescription);

  // 3. Resolve Company Pack
  const resolvedCompany = await resolveCompanyPack(input.company, roleSlug, level);

  // 4. Agenda Pillars
  const pillars = synthesizeAgendaPillars(
    mode,
    candidateData.recentRoles,
    candidateData.projects,
    jobData.requirements,
    roleSlug,
    input.type,
    validDuration
  );

  // 5. Directives
  const openingDirective =
    mode === "new_grad" && candidateData.projects.length > 0
      ? `Open by introducing yourself and stating the round length, then ask the candidate to walk through their project (${candidateData.projects[0].name}) and their core architectural choices.`
      : candidateData.recentRoles.length > 0
      ? `Open by introducing yourself and stating the round length, then ask the candidate about a key technical challenge or system they built at ${candidateData.recentRoles[0].title}.`
      : `Open by introducing yourself and stating the round length, then anchor on core ${input.role} fundamentals and problem framing.`;

  const closingDirective = "Wrap up the current topic naturally without starting a new technical thread. Never ask if the candidate has questions for you.";

  return {
    version: 1,
    candidate: {
      mode,
      recentRoles: candidateData.recentRoles,
      projects: candidateData.projects,
      stack: candidateData.stack,
      notes: candidateData.notes,
    },
    job: jobData,
    company: {
      key: resolvedCompany.resolvedKey,
      packId: resolvedCompany.pack.id,
      methodSummary: resolvedCompany.methodSummary,
      levelSignals: resolvedCompany.levelSignals,
      roleFamilySignals: resolvedCompany.roleFamilySignals,
      frequentThemes: resolvedCompany.filteredThemes.map((t) => t.shape).slice(0, 10),
    },
    profile: {
      role: input.role,
      roleSlug,
      type: input.type,
      difficulty: input.difficulty,
      durationMinutes: validDuration,
      level,
      goal,
      persona,
    },
    agenda: {
      pillars,
      openingDirective,
      closingDirective,
    },
  };
}
