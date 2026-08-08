import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    interviewSession: {
      findFirst: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import { getInterviewSession } from "./interview-repo";

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
      select: expect.objectContaining({ type: true }),
    }));
  });
});
