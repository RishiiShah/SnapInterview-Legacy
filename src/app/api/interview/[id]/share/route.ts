import { z } from "zod/v4";
import { csrfRejectIfInvalid } from "@/lib/csrf";
import { getSessionUserIdentity } from "@/lib/server-auth";
import { apiJson, badRequestError, notFoundError, unauthorizedError, internalServerError } from "@/lib/api-response";
import { generateShareToken, revokeShareToken, getShareToken } from "@/repositories/interview-repo";
import { logger } from "@/utils/logger";

const interviewIdSchema = z.string().uuid();

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getSessionUserIdentity();
    if (!authUser) return unauthorizedError();

    const { id } = await params;
    if (!interviewIdSchema.safeParse(id).success) return badRequestError("Invalid interview ID");

    const token = await getShareToken({ interviewId: id, userId: authUser.userId });
    return apiJson({ shareToken: token });
  } catch (error) {
    logger.error("Get share token error", { error: error instanceof Error ? error.message : String(error) });
    return internalServerError();
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const csrfError = await csrfRejectIfInvalid(request);
  if (csrfError) return csrfError;

  try {
    const authUser = await getSessionUserIdentity();
    if (!authUser) return unauthorizedError();

    const { id } = await params;
    if (!interviewIdSchema.safeParse(id).success) return badRequestError("Invalid interview ID");

    const token = await generateShareToken({ interviewId: id, userId: authUser.userId });
    if (!token) return notFoundError("Interview not found or not yet evaluated");

    return apiJson({ shareToken: token });
  } catch (error) {
    logger.error("Generate share token error", { error: error instanceof Error ? error.message : String(error) });
    return internalServerError();
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const csrfError = await csrfRejectIfInvalid(request);
  if (csrfError) return csrfError;

  try {
    const authUser = await getSessionUserIdentity();
    if (!authUser) return unauthorizedError();

    const { id } = await params;
    if (!interviewIdSchema.safeParse(id).success) return badRequestError("Invalid interview ID");

    await revokeShareToken({ interviewId: id, userId: authUser.userId });
    return apiJson({ shareToken: null });
  } catch (error) {
    logger.error("Revoke share token error", { error: error instanceof Error ? error.message : String(error) });
    return internalServerError();
  }
}
