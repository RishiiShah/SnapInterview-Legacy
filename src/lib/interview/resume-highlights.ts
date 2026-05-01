import type { InterviewType } from "@/lib/interview/domain";

export type ResumeHighlights = {
  skills: string[];
  suggestedType: InterviewType | null;
};

const SKILL_KEYWORDS: { label: string; patterns: RegExp[] }[] = [
  { label: "React", patterns: [/\breact(?:\.js)?\b/i, /\bjsx\b/i] },
  { label: "Node.js", patterns: [/\bnode(?:\.js)?\b/i] },
  { label: "TypeScript", patterns: [/\btypescript\b/i, /\bts\b/i] },
  { label: "Python", patterns: [/\bpython\b/i, /\bdjango\b/i, /\bflask\b/i] },
  { label: "Go", patterns: [/\bgolang\b/i, /\bgo\s+programming\b/i] },
  { label: "Rust", patterns: [/\brust\b/i] },
  { label: "Java", patterns: [/\bjava\b/i, /\bspring\s+boot\b/i] },
  { label: "AWS", patterns: [/\baws\b/i, /\bamazon\s+web\s+services\b/i, /\bs3\b/i, /\bec2\b/i, /\blambda\b/i] },
  { label: "Kubernetes", patterns: [/\bkubernetes\b/i, /\bk8s\b/i] },
  { label: "Docker", patterns: [/\bdocker\b/i, /\bcontainer(?:ized|ization)?\b/i] },
  { label: "PostgreSQL", patterns: [/\bpostgres(?:ql)?\b/i] },
  { label: "Distributed Systems", patterns: [/\bdistributed\s+systems?\b/i, /\bmicroservices\b/i] },
  { label: "System Design", patterns: [/\bsystem\s+design\b/i, /\bscalability\b/i, /\bhigh[-\s]throughput\b/i] },
  { label: "Machine Learning", patterns: [/\bmachine\s+learning\b/i, /\bml\b/i, /\bdeep\s+learning\b/i] },
  { label: "Data Engineering", patterns: [/\betl\b/i, /\bdata\s+pipeline\b/i, /\bairflow\b/i, /\bspark\b/i] },
  { label: "Frontend", patterns: [/\bfrontend\b/i, /\bfront[-\s]end\b/i, /\btailwind\b/i, /\bnext(?:\.js)?\b/i] },
  { label: "Backend", patterns: [/\bbackend\b/i, /\bback[-\s]end\b/i, /\brest\s*api\b/i, /\bgraphql\b/i] },
  { label: "Leadership", patterns: [/\blead\b/i, /\bmentor(?:ed|ing)?\b/i, /\bmanaged\s+(?:a\s+)?team\b/i] },
];

const SYSTEM_DESIGN_HINTS = ["System Design", "Distributed Systems", "Kubernetes", "AWS"];
const TECHNICAL_HINTS = ["Frontend", "Backend", "Python", "TypeScript", "Java", "Go", "Rust", "React", "Node.js"];
const BEHAVIORAL_HINTS = ["Leadership"];

export function extractResumeHighlights(resumeText: string): ResumeHighlights {
  if (!resumeText || resumeText.trim().length < 30) {
    return { skills: [], suggestedType: null };
  }

  const detected: string[] = [];
  for (const { label, patterns } of SKILL_KEYWORDS) {
    if (patterns.some((p) => p.test(resumeText))) detected.push(label);
  }

  const counts = {
    "system-design": detected.filter((s) => SYSTEM_DESIGN_HINTS.includes(s)).length,
    technical: detected.filter((s) => TECHNICAL_HINTS.includes(s)).length,
    behavioral: detected.filter((s) => BEHAVIORAL_HINTS.includes(s)).length,
  };

  let suggestedType: InterviewType | null = null;
  const max = Math.max(counts["system-design"], counts.technical, counts.behavioral);
  if (max > 0) {
    if (counts["system-design"] >= 2 && counts["system-design"] === max) {
      suggestedType = "system-design";
    } else if (counts.technical === max) {
      suggestedType = "technical";
    } else if (counts.behavioral === max) {
      suggestedType = "behavioral";
    }
  }

  return {
    skills: detected.slice(0, 5),
    suggestedType,
  };
}
