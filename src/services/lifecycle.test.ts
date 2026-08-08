/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { startInterviewSession, runInterviewChat } from "./interview-service";
import { evaluateInterviewTranscript } from "./evaluation-service";
import { prisma } from "@/lib/prisma";
import { groqClient } from "@/lib/ai/groq";
import * as interviewRepo from "@/repositories/interview-repo";
import * as transcriptService from "@/lib/interview/transcript-service";

// Mock dependencies
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
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

vi.mock("@/repositories/interview-repo");
vi.mock("@/lib/interview/transcript-service");

describe("Interview Lifecycle Integration", () => {
  const userId = "user-123";
  const interviewId = "int-456";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("completes a full interview flow: create -> chat -> evaluate", async () => {
    // 1. Create Session
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: userId,
      onboardingRole: "Software Engineer",
    } as any);
    
    vi.mocked(interviewRepo.createInterviewSession).mockResolvedValue({
      id: interviewId,
    } as any);

    const session = await startInterviewSession({
      userId,
      role: "Software Engineer",
      type: "coding-algorithms",
      difficulty: "medium",
    });

    expect(session.id).toBe(interviewId);
    expect(interviewRepo.createInterviewSession).toHaveBeenCalled();

    // 2. Run Chat (one turn)
    vi.mocked(interviewRepo.getInterviewSession).mockResolvedValue({
      id: interviewId,
      questionCount: 5,
      currentQuestion: 0,
      role: "Software Engineer",
      type: "coding-algorithms",
      difficulty: "medium",
      transcript: [],
    } as any);
    vi.mocked(interviewRepo.advanceInterviewCurrentQuestion).mockResolvedValue(true);

    // Mock Groq stream
    const mockStream = (async function* () {
      yield { choices: [{ delta: { content: "Hello! " } }] };
      yield { choices: [{ delta: { content: "Tell me about React." } }] };
    })();
    vi.mocked(groqClient.chat.completions.create).mockResolvedValue(mockStream as any);

    const chatResult = await runInterviewChat({
      userId,
      interviewId,
      rawMessages: [{ role: "user", content: "I'm ready." }],
      expectedCurrentQuestion: 0,
    });

    expect(chatResult.type).toBe("stream");
    if (chatResult.type === "stream") {
      const reader = chatResult.data.getReader();
      let fullText = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        fullText += new TextDecoder().decode(value);
      }
      expect(fullText).toBe("Hello! Tell me about React.");
    }

    // Verify transcript was saved and question incremented
    expect(transcriptService.saveLatestTranscriptEntry).toHaveBeenCalled();
    expect(interviewRepo.advanceInterviewCurrentQuestion).toHaveBeenCalledWith({
      interviewId,
      userId,
      expectedCurrentQuestion: 0,
    });

    // 3. Finalize and Evaluate
    vi.mocked(interviewRepo.getInterviewSession).mockResolvedValue({
      id: interviewId,
      status: "COMPLETED",
      type: "coding-algorithms",
      company: null,
      transcript: [
        { question: "Tell me about React.", answer: "It's a library." }
      ],
      evaluation: null,
      difficulty: "medium",
      persona: "balanced",
      jobDescription: null,
      resumeUrl: null,
      questionCount: 5,
      currentQuestion: 5,
      focusAreas: null,
      sessionPlan: null,
      role: "Software Engineer"
    } as any);

    vi.mocked(groqClient.chat.completions.create).mockResolvedValue({
      choices: [{
        message: {
          content: JSON.stringify({
            score: 85,
            feedback: "Good start.",
            strengths: ["Direct answer"],
            areasForImprovement: ["Add more depth"]
          })
        }
      }]
    } as any);

    const evalResult = await evaluateInterviewTranscript({ userId, interviewId });

    expect(evalResult.type).toBe("ok");
    if (evalResult.type === "ok") {
      expect(evalResult.data.score).toBe(85);
    }
    expect(interviewRepo.updateEvaluation).toHaveBeenCalled();
  });
});
