import { z } from "zod/v4";
import { getSessionUserIdentity } from "@/lib/server-auth";
import { apiJson, badRequestError, internalServerError, notFoundError, unauthorizedError } from "@/lib/api-response";
import { csrfRejectIfInvalid } from "@/lib/csrf";
import { upsertQuestionFeedback } from "@/repositories/interview-repo";
import { getInterviewSession } from "@/repositories/interview-repo";
import { logger } from "@/utils/logger";

const interviewIdSchema = z.string().min(1);

const feedbackBodySchema = z.object({
  questionOrder: z.number().int().min(0),
  rating: z.enum(["up", "down"]),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const csrfError = await csrfRejectIfInvalid(request);
  if (csrfError) return csrfError;

  const authUser = await getSessionUserIdentity();
  if (!authUser) return unauthorizedError();

  const { id } = await params;
  const parsedId = interviewIdSchema.safeParse(id);
  if (!parsedId.success) return badRequestError("Invalid interview ID");

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequestError("Invalid JSON body");
  }

  const parsed = feedbackBodySchema.safeParse(body);
  if (!parsed.success) return badRequestError("Invalid feedback payload");

  try {
    const session = await getInterviewSession({ interviewId: parsedId.data, userId: authUser.userId, view: "state" });
    if (!session) return notFoundError("Interview session not found");

    await upsertQuestionFeedback({
      interviewSessionId: parsedId.data,
      questionOrder: parsed.data.questionOrder,
      rating: parsed.data.rating,
    });

    return apiJson({ success: true });
  } catch (error) {
    logger.error("Upsert question feedback error:", {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalServerError();
  }
}
