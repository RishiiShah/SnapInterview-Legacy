import { getSessionUserIdentity } from "@/lib/server-auth";
import { apiJson, internalServerError, unauthorizedError } from "@/lib/api-response";
import { getUserResume, deleteUserResume } from "@/repositories/user-repo";
import { csrfRejectIfInvalid } from "@/lib/csrf";
import { logger } from "@/utils/logger";

export async function GET() {
  try {
    const authUser = await getSessionUserIdentity();
    if (!authUser) return unauthorizedError();

    const resumeText = await getUserResume(authUser.userId);
    return apiJson({ resumeText });
  } catch (error) {
    logger.error("Get user resume error:", {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalServerError();
  }
}

export async function DELETE(request: Request) {
  const csrfError = await csrfRejectIfInvalid(request);
  if (csrfError) return csrfError;

  try {
    const authUser = await getSessionUserIdentity();
    if (!authUser) return unauthorizedError();

    await deleteUserResume(authUser.userId);
    return apiJson({ success: true });
  } catch (error) {
    logger.error("Delete user resume error:", {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalServerError();
  }
}
