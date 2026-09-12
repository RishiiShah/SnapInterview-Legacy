import { prisma } from "@/lib/prisma";
import { interviewIdSchema } from "@/lib/interview/domain";
import { replayTimingInputSchema } from "@/lib/interview/replay";
import { getSessionUserIdentity } from "@/lib/server-auth";
import { parseJsonBody } from "@/lib/http/request-body";
import { apiJson, badRequestError, internalServerError, notFoundError, unauthorizedError } from "@/lib/api-response";
import { withCsrfProtection } from "@/lib/route-security";
import { logger } from "@/utils/logger";

export const POST = withCsrfProtection(async (
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) => {
  const authUser = await getSessionUserIdentity();
  if (!authUser) return unauthorizedError();

  const { id } = await params;
  const parsedId = interviewIdSchema.safeParse(id);
  if (!parsedId.success) return badRequestError("Invalid interview ID");
  const parsed = await parseJsonBody(request, replayTimingInputSchema);
  if (!parsed.ok) return parsed.response;

  try {
    const interview = await prisma.interviewSession.findFirst({
      where: { id: parsedId.data, userId: authUser.userId, deletedAt: null },
      select: { id: true },
    });
    if (!interview) return notFoundError("Interview session not found");

    const { transcriptOrder, confidenceScore, ...timestamps } = parsed.data;
    const timingData = {
      ...timestamps,
      ...(confidenceScore === undefined ? {} : { confidenceScore }),
    };
    await prisma.interviewReplayTurn.upsert({
      where: {
        interviewSessionId_transcriptOrder: {
          interviewSessionId: interview.id,
          transcriptOrder,
        },
      },
      create: { interviewSessionId: interview.id, transcriptOrder, ...timingData },
      update: timingData,
    });

    return apiJson({ success: true });
  } catch (error) {
    logger.error("Replay timing persistence error", {
      interviewId: parsedId.data,
      error: error instanceof Error ? error.message : String(error),
    });
    return internalServerError();
  }
});
