import { beforeEach, describe, expect, it, vi } from "vitest";
import { INTERVIEW_DONE_MESSAGE } from "@/lib/interview/constants";
import { Prisma } from "@/generated/prisma/client";
import { getResumableInterviewSessionState, runInterviewChat, startInterviewSession, updateSessionStatusIfOwned } from "./interview-service";
import { advanceInterviewCurrentQuestion, createInterviewSession, expireInterviewSessionIfStale, getInterviewSession, persistWhiteboardScene, updateInterviewSessionStatus } from "@/repositories/interview-repo";
import { getUserOnboardingContext } from "@/repositories/user-repo";
import { saveLatestTranscriptEntry } from "@/lib/interview/transcript-service";
import { groqClient } from "@/lib/ai/groq";
import { buildSystemInstruction } from "@/lib/interview/prompts";

vi.mock("@/repositories/interview-repo", () => ({
  getInterviewSession: vi.fn(),
  createInterviewSession: vi.fn(),
  advanceInterviewCurrentQuestion: vi.fn(),
  updateInterviewSessionStatus: vi.fn(),
  expireInterviewSessionIfStale: vi.fn(),
  persistWhiteboardScene: vi.fn(),
}));

vi.mock("@/repositories/user-repo", () => ({
  getUserOnboardingContext: vi.fn(),
}));

vi.mock("@/lib/interview/transcript-service", () => ({
  saveLatestTranscriptEntry: vi.fn(),
}));

vi.mock("@/lib/ai/groq", () => ({
  groqClient: {
    chat: {
      completions: {
        create: vi.fn(),
      },
    },
  },
}));

vi.mock("@/lib/interview/prompts", () => ({
  buildSystemInstruction: vi.fn(),
}));

function chatSession(overrides: Record<string, unknown> = {}) {
  return {
    id: "int-1",
    status: "IN_PROGRESS",
    role: "Frontend Engineer",
    company: null,
    type: "behavioral-leadership",
    difficulty: "medium",
    persona: null,
    jobDescription: null,
    resumeUrl: null,
    resumeText: null,
    durationMinutes: 30,
    questionCount: 5,
    currentQuestion: 5,
    focusAreas: null,
    sessionPlan: null,
    createdAt: new Date(),
    transcript: [],
    ...overrides,
  } as never;
}

describe("runInterviewChat", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("saves the latest transcript entry before returning done", async () => {
    vi.mocked(expireInterviewSessionIfStale).mockResolvedValue(false);
    vi.mocked(getInterviewSession).mockResolvedValue(chatSession());

    const rawMessages = [
      { role: "assistant", content: "Tell me about a project you led." },
      { role: "user", content: "I led a migration of a monolith into services." },
    ];

    const result = await runInterviewChat({
      userId: "user-1",
      interviewId: "int-1",
      rawMessages,
      expectedCurrentQuestion: 5,
    });

    expect(saveLatestTranscriptEntry).toHaveBeenCalledWith({
      interviewId: "int-1",
      currentQuestion: 5,
      messages: rawMessages,
    });
    expect(advanceInterviewCurrentQuestion).not.toHaveBeenCalled();
    expect(result).toEqual({
      type: "done",
      data: {
        done: true,
        currentQuestion: 5,
        doneMessage: INTERVIEW_DONE_MESSAGE,
      },
      });
  });

  it("returns a conflict when the client question index is stale", async () => {
    vi.mocked(expireInterviewSessionIfStale).mockResolvedValue(false);
    vi.mocked(getInterviewSession).mockResolvedValue(chatSession({ id: "int-2", currentQuestion: 1 }));

    const result = await runInterviewChat({
      userId: "user-1",
      interviewId: "int-2",
      rawMessages: [],
      expectedCurrentQuestion: 0,
    });

    expect(saveLatestTranscriptEntry).not.toHaveBeenCalled();
    expect(result).toEqual({
      type: "conflict",
      message: "Interview state changed. Please wait for the current question to finish loading and try again.",
      currentQuestion: 1,
    });
  });

  it("awaits final system-design board persistence before returning done", async () => {
    vi.mocked(expireInterviewSessionIfStale).mockResolvedValue(false);
    vi.mocked(getInterviewSession).mockResolvedValue(chatSession({
      id: "int-final-board",
      role: "Staff Engineer",
      type: "system-design",
      difficulty: "hard",
      persona: "balanced",
      sessionPlan: { brief: { profile: { level: "staff-plus" } } },
    }));
    let resolvePersistence!: (value: unknown) => void;
    vi.mocked(persistWhiteboardScene).mockReturnValue(
      new Promise((resolve) => {
        resolvePersistence = resolve;
      }) as never,
    );

    const scene = {
      version: 1 as const,
      revision: 4,
      contentHash: "final-scene",
      nodes: [{ id: "api", kind: "service", label: "API" }],
      edges: [],
    };

    const resultPromise = runInterviewChat({
      userId: "user-1",
      interviewId: "int-final-board",
      expectedCurrentQuestion: 5,
      rawMessages: [
        { role: "assistant", content: "Finish your design." },
        {
          role: "user",
          content: "The API fans out to workers.",
          board: { scene, imageBase64: "ZmluYWwtc25hcHNob3Q=", mimeType: "image/png" },
        },
      ],
    });
    let resultSettled = false;
    void resultPromise.then(() => {
      resultSettled = true;
    });

    await vi.waitFor(() => expect(persistWhiteboardScene).toHaveBeenCalledOnce());
    expect(resultSettled).toBe(false);

    resolvePersistence({});
    await expect(resultPromise).resolves.toMatchObject({ type: "done" });
    expect(persistWhiteboardScene).toHaveBeenCalledWith({
      interviewId: "int-final-board",
      userId: "user-1",
      expectedCurrentQuestion: 5,
      sessionPlan: {
        brief: { profile: { level: "staff-plus" } },
        whiteboardScene: scene,
        whiteboardSnapshot: {
          imageBase64: "ZmluYWwtc25hcHNob3Q=",
          mimeType: "image/png",
        },
      },
    });
  });

  it("rejects an expired interview before transcript or model work", async () => {
    vi.mocked(expireInterviewSessionIfStale).mockResolvedValue(true);

    const result = await runInterviewChat({
      userId: "user-1",
      interviewId: "int-expired",
      rawMessages: [{ role: "user", content: "answer" }],
      expectedCurrentQuestion: 0,
    });

    expect(result).toEqual({ type: "expired" });
    expect(getInterviewSession).not.toHaveBeenCalled();
    expect(saveLatestTranscriptEntry).not.toHaveBeenCalled();
  });

  it("persists the latest system-design scene and bounded snapshot", async () => {
    vi.mocked(expireInterviewSessionIfStale).mockResolvedValue(false);
    vi.mocked(getInterviewSession).mockResolvedValue(chatSession({
      id: "int-whiteboard",
      role: "Staff Engineer",
      type: "system-design",
      difficulty: "hard",
      persona: "balanced",
      currentQuestion: 0,
      sessionPlan: { brief: { profile: { level: "staff-plus" } } },
    }));
    vi.mocked(buildSystemInstruction).mockResolvedValue("Interview instructions");
    vi.mocked(persistWhiteboardScene).mockResolvedValue(true);
    vi.mocked(groqClient.chat.completions.create).mockResolvedValue((async function* () {
      yield { choices: [{ delta: { content: "What would you optimize next?" } }] };
    })() as never);

    const scene = {
      version: 1 as const,
      revision: 3,
      contentHash: "scene-v3",
      nodes: [{ id: "api", kind: "service", label: "API" }],
      edges: [],
    };

    const result = await runInterviewChat({
      userId: "user-1",
      interviewId: "int-whiteboard",
      expectedCurrentQuestion: 0,
      rawMessages: [
        { role: "assistant", content: "Design a notifications system." },
        {
          role: "user",
          content: "Clients connect through the API.",
          board: { scene, imageBase64: "c25hcHNob3Q=", mimeType: "image/jpeg" },
        },
      ],
    });

    expect(result.type).toBe("stream");
    expect(persistWhiteboardScene).toHaveBeenCalledWith({
      interviewId: "int-whiteboard",
      userId: "user-1",
      expectedCurrentQuestion: 0,
      sessionPlan: {
        brief: { profile: { level: "staff-plus" } },
        whiteboardScene: scene,
        whiteboardSnapshot: {
          imageBase64: "c25hcHNob3Q=",
          mimeType: "image/jpeg",
        },
      },
    });
  });

  it("clears a previous whiteboard snapshot when the newest scene has no image", async () => {
    vi.mocked(expireInterviewSessionIfStale).mockResolvedValue(false);
    vi.mocked(getInterviewSession).mockResolvedValue(chatSession({
      id: "int-text-only-board",
      role: "Staff Engineer",
      type: "system-design",
      difficulty: "hard",
      persona: "balanced",
      currentQuestion: 0,
      sessionPlan: {
        brief: { profile: { level: "staff-plus" } },
        whiteboardSnapshot: { imageBase64: "c3RhbGU=", mimeType: "image/jpeg" },
      },
    }));
    vi.mocked(buildSystemInstruction).mockResolvedValue("Interview instructions");
    vi.mocked(persistWhiteboardScene).mockResolvedValue(true);
    vi.mocked(groqClient.chat.completions.create).mockResolvedValue((async function* () {
      yield { choices: [{ delta: { content: "What would you optimize next?" } }] };
    })() as never);

    const scene = {
      version: 1 as const,
      revision: 5,
      contentHash: "text-only-scene",
      nodes: [{ id: "worker", kind: "service", label: "Worker" }],
      edges: [],
    };

    await runInterviewChat({
      userId: "user-1",
      interviewId: "int-text-only-board",
      expectedCurrentQuestion: 0,
      rawMessages: [
        { role: "assistant", content: "Update your design." },
        {
          role: "user",
          content: "Workers now process the events.",
          board: { scene, mimeType: "image/jpeg" },
        },
      ],
    });

    expect(persistWhiteboardScene).toHaveBeenCalledWith({
      interviewId: "int-text-only-board",
      userId: "user-1",
      expectedCurrentQuestion: 0,
      sessionPlan: {
        brief: { profile: { level: "staff-plus" } },
        whiteboardScene: scene,
      },
    });
  });
});

describe("getResumableInterviewSessionState", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("expires an in-progress session at the exact 24-hour cutoff", async () => {
    const now = new Date("2026-08-12T12:00:00.000Z");
    vi.mocked(expireInterviewSessionIfStale).mockResolvedValue(true);

    const result = await getResumableInterviewSessionState({
      userId: "user-1",
      interviewId: "int-expired",
      now,
    });

    expect(result).toEqual({ type: "expired" });
    expect(expireInterviewSessionIfStale).toHaveBeenCalledWith({
      userId: "user-1",
      interviewId: "int-expired",
      cutoff: new Date("2026-08-11T12:00:00.000Z"),
    });
  });
});

describe("startInterviewSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("derives adaptive defaults from onboarding state", async () => {
    vi.mocked(getUserOnboardingContext).mockResolvedValue({
      onboardingGoal: "prepare-for-promo",
      onboardingLevel: "staff-plus",
      onboardingRole: "Staff Engineer",
      onboardingCompany: "Stripe",
    });
    vi.mocked(createInterviewSession).mockResolvedValue({ id: "int-2" });

    const result = await startInterviewSession({
      userId: "user-1",
      role: "",
      company: null,
      type: "system-design",
      difficulty: "hard",
      persona: "strict",
      questionCount: 15,
    });

    expect(createInterviewSession).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-1",
        role: "Staff Engineer",
        company: "Stripe",
        persona: "strict",
        questionCount: 15,
        sessionPlan: expect.objectContaining({
          version: 1,
          brief: expect.objectContaining({
            company: expect.objectContaining({ packId: "stripe" }),
            profile: expect.objectContaining({
              level: "staff-plus",
              persona: "strict",
              type: "system-design",
            }),
          }),
        }),
      })
    );
    expect(result).toEqual({ id: "int-2" });
  });

  it("falls back to balanced persona and user inputs when onboarding is missing", async () => {
    vi.mocked(getUserOnboardingContext).mockResolvedValue(null);
    vi.mocked(createInterviewSession).mockResolvedValue({ id: "int-3" });

    await startInterviewSession({
      userId: "user-2",
      role: "Frontend Engineer",
      company: "Acme",
      type: "behavioral-leadership",
      difficulty: "medium",
    });

    expect(createInterviewSession).toHaveBeenCalledWith(
      expect.objectContaining({
        role: "Frontend Engineer",
        company: "Acme",
        persona: "balanced",
        questionCount: 10,
        sessionPlan: expect.objectContaining({
          version: 1,
          brief: expect.objectContaining({
            company: expect.objectContaining({ packId: "general" }),
            profile: expect.objectContaining({
              role: "Frontend Engineer",
              type: "behavioral-leadership",
              difficulty: "medium",
            }),
          }),
        }),
      })
    );
  });

});

describe("updateSessionStatusIfOwned", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns a conflict when videoKey uniqueness is violated", async () => {
    vi.mocked(getInterviewSession).mockResolvedValue({
      id: "int-4",
      status: "IN_PROGRESS",
      type: "coding-algorithms",
      persona: null,
      videoUrl: null,
      videoKey: null,
      durationMinutes: 30,
      createdAt: new Date(),
      questionCount: 10,
      currentQuestion: 0,
    });
    vi.mocked(updateInterviewSessionStatus).mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
        code: "P2002",
        clientVersion: "test",
        meta: { target: ["videoKey"] },
      }),
    );

    const result = await updateSessionStatusIfOwned({
      userId: "user-1",
      interviewId: "int-4",
      videoKey: "user-1/interview-duplicate.webm",
      status: "COMPLETED",
    });

    expect(result).toEqual({
      type: "conflict",
      message: "Video recording is already linked to another interview session.",
    });
  });
});
