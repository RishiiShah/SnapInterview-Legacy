import { apiError, apiJson, notFoundError, internalServerError } from "@/lib/api-response";
import { createRateLimiter } from "@/lib/rate-limit";
import { getSharedInterview } from "@/repositories/interview-repo";
import { logger } from "@/utils/logger";

const SHARE_TOKEN_PATTERN = /^[a-f0-9]{32}$/i;
const shareLookupLimiter = createRateLimiter("share-link-lookup", 60 * 1000, 120);

function getPublicRateLimitKey(req: Request) {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip")?.trim() ||
    "unknown"
  );
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    if (!token || !SHARE_TOKEN_PATTERN.test(token)) return notFoundError("Invalid share link");

    if (await shareLookupLimiter.isLimited(getPublicRateLimitKey(req))) {
      return apiError("Too many share link requests. Please try again later.", 429);
    }

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
