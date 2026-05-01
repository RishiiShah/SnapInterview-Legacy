import { apiJson, notFoundError, internalServerError } from "@/lib/api-response";
import { getSharedInterview } from "@/repositories/interview-repo";
import { logger } from "@/utils/logger";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    if (!token || token.length > 64) return notFoundError("Invalid share link");

    const interview = await getSharedInterview(token);
    if (!interview) return notFoundError("This share link is no longer active");

    return apiJson({
      role: interview.role,
      company: interview.company,
      type: interview.type,
      difficulty: interview.difficulty,
      evaluation: interview.evaluation,
      createdAt: interview.createdAt.toISOString(),
    });
  } catch (error) {
    logger.error("Get shared interview error", { error: error instanceof Error ? error.message : String(error) });
    return internalServerError();
  }
}
