import { describe, it, expect } from "vitest";
import { buildInterviewBrief } from "./brief";

describe("buildInterviewBrief", () => {
  it("uses a targeted round contract instead of generic type pillars", async () => {
    const brief = await buildInterviewBrief({
      role: "Software Engineer - Frontend",
      company: "Amazon",
      type: "domain-role",
      difficulty: "medium",
      durationMinutes: 45,
      roundProfile: {
        round_key: "frontend-coding",
        stage: "interview_loop",
        purpose: "Assess practical frontend implementation.",
        competencies: ["JavaScript", "Component design", "Accessibility", "Testing"],
        question_strategy: {
          preferred_categories: ["Front-end"],
          required_tags: [],
          preferred_tags: ["react"],
          excluded_tags: ["distributed-systems"],
          company_theme_ids: [],
          avoid_plan_question_repeats: true,
        },
        rubric_key: "amazon-frontend-implementation-v1",
        rubric_dimensions: [
          { key: "implementation", label: "Implementation", weight: 1, description: "Builds a sound UI." },
        ],
        context_mode: "fresh",
      },
    });

    expect(brief.agenda.pillars.map((pillar) => pillar.title)).toEqual([
      "JavaScript",
      "Component design",
      "Accessibility",
      "Testing",
    ]);
    expect(brief.agenda.openingDirective).toContain("frontend-coding");
    expect(brief.agenda.openingDirective).toContain("Assess practical frontend implementation");
  });

  it("detects new_grad mode for entry-level candidates with projects", async () => {
    const brief = await buildInterviewBrief({
      role: "Software Engineer - Backend",
      company: "Amazon",
      type: "system-design",
      difficulty: "easy",
      durationMinutes: 30,
      level: "entry-level",
      onboardingGoal: "land-first-role",
      resumeText: `## Education
B.S. in Computer Science, 2026

## Projects
Distributed Key-Value Store. Built a Raft-based KV store in Go with gRPC. Handled leader election and log replication.
Portfolio Website. Built with Next.js and Tailwind.`,
    });

    expect(brief.candidate.mode).toBe("new_grad");
    expect(brief.company.packId).toBe("amazon");
    expect(brief.profile.roleSlug).toBe("software-engineer-backend");
    expect(brief.agenda.pillars.length).toBe(3);
    expect(brief.agenda.pillars[0].source).toBe("project");
    expect(brief.agenda.pillars[0].title).toContain("Distributed Key-Value Store");
    expect(brief.agenda.closingDirective).toContain("Never ask if the candidate has questions for you");
  });

  it("detects experienced mode when resume shows multi-year employment even if goal is land-first-role", async () => {
    const brief = await buildInterviewBrief({
      role: "Software Engineer - Full Stack",
      company: "Stripe",
      type: "behavioral-leadership",
      difficulty: "medium",
      durationMinutes: 45,
      onboardingGoal: "land-first-role",
      resumeText: `## Experience
Senior Software Engineer at FinTech Corp. Led real-time payments engine processing 10k TPS.
Software Engineer at Cloud Inc. Built distributed ledger pipelines in Go.

## Skills
Go, TypeScript, PostgreSQL, Kafka`,
    });

    expect(brief.candidate.mode).toBe("experienced");
    expect(brief.company.packId).toBe("stripe");
    expect(brief.candidate.recentRoles.length).toBe(2);
    expect(brief.agenda.pillars.length).toBe(4);
    expect(brief.agenda.pillars[0].source).toBe("resume");
  });

  it("falls back gracefully when no resume or JD is provided", async () => {
    const brief = await buildInterviewBrief({
      role: "Site Reliability Engineer (SRE)",
      company: "Google",
      type: "system-design",
      difficulty: "hard",
      durationMinutes: 15,
    });

    expect(brief.candidate.mode).toBe("unknown");
    expect(brief.company.packId).toBe("google");
    expect(brief.profile.durationMinutes).toBe(15);
    expect(brief.agenda.pillars.length).toBe(2);
    expect(brief.job.present).toBe(false);
  });
});
