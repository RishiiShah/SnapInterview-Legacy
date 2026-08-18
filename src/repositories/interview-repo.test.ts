import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    interviewSession: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import {
  claimInterviewEvaluation,
  completeExpiredInterviewSessions,
  expireInterviewSessionIfStale,
  getInterviewSession,
  listCompletedSessionsForUser,
  persistClaimedEvaluation,
  persistWhiteboardScene,
  releaseInterviewEvaluationClaim,
  softDeleteInterviewSession,
  updateInterviewSessionStatus,
  advanceInterviewCurrentQuestion,
} from "./interview-repo";

describe("getInterviewSession state view", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the interview type needed to select the room layout on reload", async () => {
    vi.mocked(prisma.interviewSession.findFirst).mockResolvedValue({
      id: "interview-1",
      status: "IN_PROGRESS",
      videoUrl: null,
      videoKey: null,
      questionCount: 5,
      currentQuestion: 0,
      persona: "balanced",
      type: "coding-algorithms",
    } as never);

    const session = await getInterviewSession({
      interviewId: "interview-1",
      userId: "user-1",
      view: "state",
    });

    expect(session).toMatchObject({ type: "coding-algorithms" });
    expect(prisma.interviewSession.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "interview-1", userId: "user-1", deletedAt: null },
      select: expect.objectContaining({ type: true }),
    }));
  });

  it("excludes soft-deleted sessions from every active view", async () => {
    vi.mocked(prisma.interviewSession.findFirst).mockResolvedValue(null);

    await getInterviewSession({
      interviewId: "int-1",
      userId: "user-1",
      view: "chat",
    });

    expect(prisma.interviewSession.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "int-1", userId: "user-1", deletedAt: null },
      }),
    );
  });
});

describe("active interview mutations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("soft deletes only an owned active row", async () => {
    const deletedAt = new Date("2026-08-17T12:00:00.000Z");
    vi.mocked(prisma.interviewSession.updateMany).mockResolvedValue({ count: 1 } as never);

    await expect(
      softDeleteInterviewSession({
        interviewId: "int-1",
        userId: "user-1",
        deletedAt,
      }),
    ).resolves.toBe(true);

    expect(prisma.interviewSession.updateMany).toHaveBeenCalledWith({
      where: { id: "int-1", userId: "user-1", deletedAt: null },
      data: { deletedAt, shareToken: null },
    });
  });

  it("persists whiteboard scene only for an owned in-progress row at the expected question", async () => {
    vi.mocked(prisma.interviewSession.updateMany).mockResolvedValue({ count: 1 } as never);

    await expect(
      persistWhiteboardScene({
        interviewId: "int-1",
        userId: "user-1",
        expectedCurrentQuestion: 2,
        sessionPlan: { whiteboardScene: { nodes: [] } },
      }),
    ).resolves.toBe(true);

    expect(prisma.interviewSession.updateMany).toHaveBeenCalledWith({
      where: {
        id: "int-1",
        userId: "user-1",
        deletedAt: null,
        status: "IN_PROGRESS",
        currentQuestion: 2,
      },
      data: { sessionPlan: { whiteboardScene: { nodes: [] } } },
    });
  });

  it("updates status only for an owned active row", async () => {
    vi.mocked(prisma.interviewSession.update).mockResolvedValue({ id: "int-1" } as never);

    await updateInterviewSessionStatus({
      interviewId: "int-1",
      userId: "user-1",
      status: "COMPLETED",
    });

    expect(prisma.interviewSession.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "int-1", userId: "user-1", deletedAt: null },
      }),
    );
  });

  it("advances only an owned active row at the expected question", async () => {
    vi.mocked(prisma.interviewSession.updateMany).mockResolvedValue({ count: 1 } as never);

    await advanceInterviewCurrentQuestion({
      interviewId: "int-1",
      userId: "user-1",
      expectedCurrentQuestion: 2,
    });

    expect(prisma.interviewSession.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: "int-1",
          userId: "user-1",
          deletedAt: null,
          status: "IN_PROGRESS",
          currentQuestion: 2,
        },
      }),
    );
  });
});

describe("interview resume expiry", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("completes only the owned in-progress session at or before the cutoff", async () => {
    const cutoff = new Date("2026-08-11T12:00:00.000Z");
    vi.mocked(prisma.interviewSession.updateMany).mockResolvedValue({ count: 1 } as never);

    const expired = await expireInterviewSessionIfStale({
      interviewId: "interview-1",
      userId: "user-1",
      cutoff,
    });

    expect(expired).toBe(true);
    expect(prisma.interviewSession.updateMany).toHaveBeenCalledWith({
      where: {
        id: "interview-1",
        userId: "user-1",
        status: "IN_PROGRESS",
        deletedAt: null,
        createdAt: { lte: cutoff },
      },
      data: { status: "COMPLETED" },
    });
  });

  it("rechecks expiry conditions when completing a bounded cleanup batch", async () => {
    const cutoff = new Date("2026-08-11T12:00:00.000Z");
    vi.mocked(prisma.interviewSession.findMany).mockResolvedValue([
      { id: "interview-1" },
      { id: "interview-2" },
    ] as never);
    vi.mocked(prisma.interviewSession.updateMany).mockResolvedValue({ count: 1 } as never);

    const completed = await completeExpiredInterviewSessions({ cutoff, limit: 500 });

    expect(completed).toBe(1);
    expect(prisma.interviewSession.findMany).toHaveBeenCalledWith({
      where: {
        status: "IN_PROGRESS",
        deletedAt: null,
        createdAt: { lte: cutoff },
      },
      select: { id: true },
      orderBy: { createdAt: "asc" },
      take: 500,
    });
    expect(prisma.interviewSession.updateMany).toHaveBeenCalledWith({
      where: {
        id: { in: ["interview-1", "interview-2"] },
        status: "IN_PROGRESS",
        deletedAt: null,
        createdAt: { lte: cutoff },
      },
      data: { status: "COMPLETED" },
    });
  });
});

describe("listCompletedSessionsForUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("seeks from a stable created-at and ID cursor instead of scanning an offset", async () => {
    vi.mocked(prisma.interviewSession.findMany).mockResolvedValue([] as never);
    const createdAt = new Date("2026-08-10T12:00:00.000Z");

    await listCompletedSessionsForUser({
      userId: "user-1",
      limit: 12,
      offset: 0,
      cursor: { createdAt, id: "22222222-2222-4222-8222-222222222222" },
    } as never);

    expect(prisma.interviewSession.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        userId: "user-1",
        deletedAt: null,
        status: "COMPLETED",
        OR: [
          { createdAt: { lt: createdAt } },
          {
            createdAt,
            id: { lt: "22222222-2222-4222-8222-222222222222" },
          },
        ],
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 13,
    }));
    expect(prisma.interviewSession.findMany).not.toHaveBeenCalledWith(expect.objectContaining({ skip: expect.anything() }));
  });
});

describe("interview evaluation claims", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("claims only the matching version when no fresh owner exists", async () => {
    vi.mocked(prisma.interviewSession.updateMany).mockResolvedValue({ count: 1 } as never);
    const claimedAt = new Date("2026-08-11T12:00:00.000Z");
    const staleBefore = new Date("2026-08-11T11:50:00.000Z");

    const claimVersion = await claimInterviewEvaluation({
      interviewId: "interview-1",
      userId: "user-1",
      expectedClaimVersion: 4,
      claimedAt,
      staleBefore,
    });

    expect(claimVersion).toBe(5);
    expect(prisma.interviewSession.updateMany).toHaveBeenCalledWith({
      where: {
        id: "interview-1",
        userId: "user-1",
        deletedAt: null,
        evaluationClaimVersion: 4,
        OR: [
          { evaluationStartedAt: null },
          { evaluationStartedAt: { lt: staleBefore } },
        ],
      },
      data: {
        evaluationStartedAt: claimedAt,
        evaluationClaimVersion: { increment: 1 },
      },
    });
  });

  it("does not persist or release a result after ownership changes", async () => {
    vi.mocked(prisma.interviewSession.updateMany).mockResolvedValue({ count: 0 } as never);

    const persisted = await persistClaimedEvaluation({
      interviewId: "interview-1",
      userId: "user-1",
      claimVersion: 5,
      evaluation: { score: 90 },
    });
    await releaseInterviewEvaluationClaim({
      interviewId: "interview-1",
      userId: "user-1",
      claimVersion: 5,
    });

    expect(persisted).toBe(false);
    expect(prisma.interviewSession.updateMany).toHaveBeenNthCalledWith(1, expect.objectContaining({
      where: expect.objectContaining({ userId: "user-1", deletedAt: null, evaluationClaimVersion: 5 }),
      data: { evaluation: { score: 90 }, evaluationStartedAt: null },
    }));
    expect(prisma.interviewSession.updateMany).toHaveBeenNthCalledWith(2, expect.objectContaining({
      where: expect.objectContaining({ userId: "user-1", deletedAt: null, evaluationClaimVersion: 5 }),
      data: { evaluationStartedAt: null },
    }));
  });
});
