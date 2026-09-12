import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { interviewIdSchema } from "@/lib/interview/domain";
import { buildVoiceAnalysis, voiceTurnInputSchema } from "@/lib/interview/voice-analysis";
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

  const parsed = await parseJsonBody(request, voiceTurnInputSchema);
  if (!parsed.ok) return parsed.response;

  try {
    const interview = await prisma.interviewSession.findFirst({
      where: { id: parsedId.data, userId: authUser.userId, deletedAt: null },
      select: { id: true },
    });
    if (!interview) return notFoundError("Interview session not found");

    const analysis = await prisma.voiceAnalysis.upsert({
      where: { interviewSessionId: interview.id },
      create: { interviewSessionId: interview.id },
      update: {},
      select: { id: true },
    });
    const turn = parsed.data;
    await prisma.voiceTurnAnalysis.upsert({
      where: {
        voiceAnalysisId_transcriptOrder: {
          voiceAnalysisId: analysis.id,
          transcriptOrder: turn.transcriptOrder,
        },
      },
      create: { voiceAnalysisId: analysis.id, ...turn },
      update: turn,
    });

    const savedTurns = await prisma.voiceTurnAnalysis.findMany({
      where: { voiceAnalysisId: analysis.id },
      orderBy: { transcriptOrder: "asc" },
    });
    const result = buildVoiceAnalysis(savedTurns);
    await prisma.voiceAnalysis.update({
      where: { id: analysis.id },
      data: {
        status: result.status,
        analyzerVersion: result.analyzerVersion,
        audioQualityScore: result.audioQualityScore,
        confidenceScore: result.confidenceScore,
        aggregateMetrics: result.aggregateMetrics as unknown as Prisma.InputJsonValue,
        coachingSummary: result.coachingSummary,
        completedAt: result.status === "COMPLETED" ? new Date() : null,
      },
    });

    return apiJson({ status: result.status });
  } catch (error) {
    logger.error("Voice analysis persistence error", {
      interviewId: parsedId.data,
      error: error instanceof Error ? error.message : String(error),
    });
    return internalServerError();
  }
});
