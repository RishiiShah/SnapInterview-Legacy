import { z } from "zod/v4";
import { prisma } from "@/lib/prisma";
import { csrfRejectIfInvalid } from "@/lib/csrf";
import { apiJson, badRequestError, internalServerError, notFoundError, unauthorizedError } from "@/lib/api-response";
import { normalizeOnboardingResponse } from "@/lib/onboarding/preferences";
import { getSessionUserIdentity } from "@/lib/server-auth";
import { logger } from "@/utils/logger";

const onboardingSchema = z.object({
  onboardingRole: z.string().trim().min(1, "Target role is required"),
  onboardingLevel: z.string().trim().min(1, "Experience level is required"),
  onboardingCompany: z.string().trim().max(100).optional().default(""),
  onboardingGoal: z.string().trim().min(1, "Primary goal is required"),
  preferredInterviewType: z.enum(["behavioral", "technical", "system-design", "leadership"]),
});

export async function GET() {
  try {
    const authUser = await getSessionUserIdentity();
    if (!authUser) {
      return unauthorizedError();
    }

    const where = authUser.email
      ? { email: authUser.email }
      : { id: authUser.userId };

    const user = await prisma.user.findUnique({
      where,
      select: {
        onboardingCompletedAt: true,
        onboardingRole: true,
        onboardingLevel: true,
        onboardingCompany: true,
        onboardingGoal: true,
        preferredInterviewType: true,
      },
    });

    if (!user) {
      return notFoundError("User not found");
    }

    return apiJson(
      normalizeOnboardingResponse({
        onboardingCompleted: Boolean(user.onboardingCompletedAt),
        onboardingRole: user.onboardingRole,
        onboardingLevel: user.onboardingLevel,
        onboardingCompany: user.onboardingCompany,
        onboardingGoal: user.onboardingGoal,
        preferredInterviewType: user.preferredInterviewType,
      })
    );
  } catch (error) {
    logger.error("Get onboarding preferences error:", {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalServerError();
  }
}

export async function PUT(req: Request) {
  try {
    const csrfError = csrfRejectIfInvalid(req);
    if (csrfError) return csrfError;

    const authUser = await getSessionUserIdentity();
    if (!authUser) {
      return unauthorizedError();
    }

    const body = await req.json();
    const parsed = onboardingSchema.safeParse(body);
    if (!parsed.success) {
      return badRequestError(parsed.error.issues[0]?.message || "Invalid onboarding preferences");
    }

    const values = parsed.data;

    const where = authUser.email
      ? { email: authUser.email }
      : { id: authUser.userId };

    await prisma.user
      .update({
        where,
        data: {
          onboardingCompletedAt: new Date(),
          onboardingRole: values.onboardingRole,
          onboardingLevel: values.onboardingLevel,
          onboardingCompany: values.onboardingCompany || null,
          onboardingGoal: values.onboardingGoal,
          preferredInterviewType: values.preferredInterviewType,
          isFirstLogin: false,
        },
      })
      .catch((error) => {
        if (error instanceof Error && "code" in error && error.code === "P2025") {
          return null;
        }
        throw error;
      });

    const updated = await prisma.user.findUnique({
      where,
      select: { id: true },
    });

    if (!updated) {
      return notFoundError("User not found");
    }

    return apiJson({ success: true });
  } catch (error) {
    logger.error("Update onboarding preferences error:", {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalServerError();
  }
  }