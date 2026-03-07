import { beforeEach, describe, expect, it, vi } from "vitest";
import { INTERVIEW_DONE_MESSAGE } from "@/lib/interview/constants";
import { runInterviewChat } from "./interview-service";
import { getInterviewSession, incrementCurrentQuestion } from "@/repositories/interview-repo";
import { saveLatestTranscriptEntry } from "@/lib/interview/transcript-service";

vi.mock("@/repositories/interview-repo", () => ({
  getInterviewSession: vi.fn(),
  createInterviewSession: vi.fn(),
  incrementCurrentQuestion: vi.fn(),
  updateInterviewSessionStatus: vi.fn(),
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

describe("runInterviewChat", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("saves the latest transcript entry before returning done", async () => {
    vi.mocked(getInterviewSession).mockResolvedValue({
      id: "int-1",
      role: "Frontend Engineer",
      company: null,
      type: "behavioral",
      difficulty: "medium",
      jobDescription: null,
      resumeUrl: null,
      questionCount: 5,
      currentQuestion: 5,
    });

    const rawMessages = [
      { role: "assistant", content: "Tell me about a project you led." },
      { role: "user", content: "I led a migration of a monolith into services." },
    ];

    const result = await runInterviewChat({
      userId: "user-1",
      interviewId: "int-1",
      rawMessages,
    });

    expect(saveLatestTranscriptEntry).toHaveBeenCalledWith({
      interviewId: "int-1",
      currentQuestion: 5,
      messages: rawMessages,
    });
    expect(incrementCurrentQuestion).not.toHaveBeenCalled();
    expect(result).toEqual({
      type: "done",
      data: {
        done: true,
        currentQuestion: 5,
        doneMessage: INTERVIEW_DONE_MESSAGE,
      },
    });
  });
});
