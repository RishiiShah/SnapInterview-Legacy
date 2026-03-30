import { z } from "zod/v4";
import { prisma } from "@/lib/prisma";
import { apiJson, badRequestError, internalServerError, notFoundError, unauthorizedError } from "@/lib/api-response";
import { getSessionUserIdentity } from "@/lib/server-auth";
import { withCsrfProtection } from "@/lib/route-security";
import { logger } from "@/utils/logger";

const profileSchema = z.object({
  name: z.string().trim().min(1, "Display name is required").max(100, "Display name is too long"),
});

export const PUT = withCsrfProtection(async (req: Request) => {
  try {
    const authUser = await getSessionUserIdentity();
    if (!authUser) {
      return unauthorizedError();
    }

    const body = await req.json();
    const parsed = profileSchema.safeParse(body);
    if (!parsed.success) {
      return badRequestError(parsed.error.issues[0]?.message || "Invalid profile details");
    }

    const updated = await prisma.user.update({
      where: { id: authUser.userId },
      data: {
        name: parsed.data.name,
      },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
      },
    }).catch((error) => {
      if (error instanceof Error && "code" in error && error.code === "P2025") {
        return null;
      }
      throw error;
    });

    if (!updated) {
      return notFoundError("User not found");
    }

    return apiJson({
      user: {
        id: updated.id,
        name: updated.name ?? "",
        email: updated.email,
        image: updated.image,
      },
    });
  } catch (error) {
    logger.error("Update profile error:", {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalServerError();
  }
});
