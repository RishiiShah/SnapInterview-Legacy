import { describe, expect, it } from "vitest";
import {
  chunkJobDescription,
  chunkResumeSemantic,
  extractKeyTechnicalTerms,
  selectActiveResumeChunk,
  selectDiverseChunks,
  type ScoredSemanticChunk,
} from "./chunker";

describe("extractKeyTechnicalTerms", () => {
  it("extracts unique keywords and ignores stop words and numbers", () => {
    const text = "Built scalable microservices in TypeScript and Go with Redis, Kafka, and Docker on AWS.";
    const terms = extractKeyTechnicalTerms(text);

    expect(terms).toContain("TypeScript");
    expect(terms).toContain("Redis");
    expect(terms).toContain("Kafka");
    expect(terms).toContain("Docker");
    expect(terms).toContain("AWS");
    expect(terms).toContain("microservices");
    expect(terms).not.toContain("and");
    expect(terms).not.toContain("with");
    expect(terms).not.toContain("in");
  });
});

describe("chunkResumeSemantic", () => {
  it("parses structured sections and keeps technical skills together", () => {
    const resume = `
John Doe
Software Engineer

## TECHNICAL SKILLS
- Programming Languages: TypeScript, Python, Go, C++
- Frameworks & DB: React, Next.js, Node.js, PostgreSQL, Redis
- Tools: Docker, Kubernetes, AWS, Git

## WORK EXPERIENCE
Senior Backend Engineer | Acme Corp (2022 - Present)
- Architected a distributed messaging bus handling 50k events/sec.
- Reduced p99 query latency by 45% with optimized Redis caching.

## PROJECTS
Real-time Analytics Dashboard
- Built real-time dashboard using WebSockets and ClickHouse.
    `.trim();

    const chunks = chunkResumeSemantic(resume);

    expect(chunks.length).toBeGreaterThanOrEqual(3);

    const skillsChunk = chunks.find((c) => c.section === "skills");
    expect(skillsChunk).toBeDefined();
    expect(skillsChunk?.text).toContain("TypeScript");
    expect(skillsChunk?.text).toContain("PostgreSQL");
    expect(skillsChunk?.priority).toBeGreaterThanOrEqual(1.2);

    const expChunk = chunks.find((c) => c.section === "experience");
    expect(expChunk).toBeDefined();
    expect(expChunk?.text).toContain("distributed messaging bus");

    const projectChunk = chunks.find((c) => c.section === "projects");
    expect(projectChunk).toBeDefined();
    expect(projectChunk?.text).toContain("ClickHouse");
  });

  it("handles empty or whitespace text gracefully", () => {
    expect(chunkResumeSemantic("")).toEqual([]);
    expect(chunkResumeSemantic("   ")).toEqual([]);
  });
});

describe("chunkJobDescription", () => {
  it("breaks job description paragraphs into clean semantic chunks", () => {
    const jd = `
We are looking for a Staff Infrastructure Engineer to scale our Kubernetes clusters.

Requirements:
- 5+ years building distributed cloud infrastructure on AWS or GCP.
- Deep expertise in Terraform, Helm, and CI/CD pipelines.
- Experience with Prometheus, Grafana, and OpenTelemetry observability.
    `.trim();

    const chunks = chunkJobDescription(jd);
    expect(chunks.length).toBeGreaterThanOrEqual(1);
    expect(chunks[0].section).toBe("job_description");
    expect(chunks.some((c) => c.keywords.includes("Kubernetes"))).toBe(true);
  });
});

describe("selectDiverseChunks", () => {
  it("filters out redundant chunks and respects limit", () => {
    const mockCosine = (a: number[], b: number[]) => {
      // Return 0.9 if identical, 0.2 if distinct
      return a[0] === b[0] ? 0.95 : 0.1;
    };

    const scored: ScoredSemanticChunk[] = [
      {
        id: "c1",
        section: "skills",
        text: "React and Redux",
        keywords: ["React", "Redux"],
        priority: 1.2,
        score: 0.9,
        selected: false,
        vector: [1, 0, 0],
      },
      {
        id: "c2",
        section: "skills",
        text: "React, Redux, state management",
        keywords: ["React", "Redux"],
        priority: 1.2,
        score: 0.88,
        selected: false,
        vector: [1, 0, 0], // identical vector -> redundant
      },
      {
        id: "c3",
        section: "experience",
        text: "Postgres and Kafka event streaming",
        keywords: ["Postgres", "Kafka"],
        priority: 1.0,
        score: 0.75,
        selected: false,
        vector: [0, 1, 0], // different vector
      },
    ];

    const selected = selectDiverseChunks(scored, 2, mockCosine, 0.85);

    expect(selected.length).toBe(2);
    expect(selected[0].id).toBe("c1");
    expect(selected[1].id).toBe("c3"); // c2 skipped due to redundancy with c1
  });
});

describe("selectActiveResumeChunk", () => {
  const chunks = [
    { id: "skills_1", section: "skills" as const, text: "Skills", keywords: [], priority: 1.2 },
    { id: "exp_1", section: "experience" as const, text: "Exp 1", keywords: [], priority: 1.0 },
    { id: "proj_1", section: "projects" as const, text: "Proj 1", keywords: [], priority: 0.9 },
  ];

  it("selects skills on turn 0 or 1 if not yet covered", () => {
    const { activeChunk } = selectActiveResumeChunk(chunks, new Set(), 0);
    expect(activeChunk?.id).toBe("skills_1");
  });

  it("selects next unprobed chunk on later turns", () => {
    const covered = new Set(["skills_1"]);
    const { activeChunk } = selectActiveResumeChunk(chunks, covered, 2);
    expect(activeChunk?.id).toBe("exp_1");
  });

  it("progresses to projects when experience is covered", () => {
    const covered = new Set(["skills_1", "exp_1"]);
    const { activeChunk, unprobedCount } = selectActiveResumeChunk(chunks, covered, 3);
    expect(activeChunk?.id).toBe("proj_1");
    expect(unprobedCount).toBe(1);
  });

  it("selects skills during early warmup stage based on elapsed time", () => {
    const startedAt = new Date(Date.now() - 2 * 60_000).toISOString(); // 2 mins into 30 min (6.6% < 25%)
    const { activeChunk } = selectActiveResumeChunk(chunks, new Set(), 0, {
      startedAt,
      durationMinutes: 30,
    });
    expect(activeChunk?.id).toBe("skills_1");
  });

  it("selects next unprobed priority chunk when elapsed time is past early stage", () => {
    const startedAt = new Date(Date.now() - 15 * 60_000).toISOString(); // 15 mins into 30 min (50% >= 25%)
    const { activeChunk } = selectActiveResumeChunk(chunks, new Set(), 2, {
      startedAt,
      durationMinutes: 30,
    });
    expect(activeChunk?.id).toBe("skills_1"); // If skills not covered, highest priority (1.2) still picks skills
  });

  it("selects experience chunk when past early stage and skills covered", () => {
    const startedAt = new Date(Date.now() - 15 * 60_000).toISOString();
    const covered = new Set(["skills_1"]);
    const { activeChunk } = selectActiveResumeChunk(chunks, covered, 2, {
      startedAt,
      durationMinutes: 30,
    });
    expect(activeChunk?.id).toBe("exp_1");
  });
});
