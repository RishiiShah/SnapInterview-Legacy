import type { Prisma } from "@/generated/prisma/client";
import type { InterviewBoardAttachment } from "@/lib/interview/chat-messages";
import { persistWhiteboardScene } from "@/repositories/interview-repo";

export async function persistWhiteboardEvidence(params: {
  interviewId: string;
  userId: string;
  expectedCurrentQuestion: number;
  existingSessionPlan?: unknown;
  board: InterviewBoardAttachment;
}): Promise<boolean> {
  const { interviewId, userId, expectedCurrentQuestion, existingSessionPlan, board } = params;
  if (!board?.scene) {
    return false;
  }

  const existingPlan = (existingSessionPlan && typeof existingSessionPlan === "object")
    ? (existingSessionPlan as Record<string, unknown>)
    : {};
  const { whiteboardSnapshot: _previousWhiteboardSnapshot, ...planWithoutSnapshot } = existingPlan;

  return persistWhiteboardScene({
    interviewId,
    userId,
    expectedCurrentQuestion,
    sessionPlan: {
      ...planWithoutSnapshot,
      whiteboardScene: board.scene,
      ...(board.imageBase64
        ? {
            whiteboardSnapshot: {
              imageBase64: board.imageBase64,
              mimeType: board.mimeType,
            },
          }
        : {}),
    } as unknown as Prisma.InputJsonValue,
  });
}
