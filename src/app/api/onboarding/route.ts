import { z } from "zod/v4";
import { prisma } from "@/lib/prisma";
import { apiJson, badRequestError, internalServerError, notFoundError, unauthorizedError } from "@/lib/api-response";
import { normalizeOnboardingResponse } from "@/lib/onboarding/preferences";
import { withCsrfProtection } from "@/lib/route-security";
import { getSessionUserIdentity } from "@/lib/server-auth";
import { parseJsonBody } from "@/lib/http/request-body";
import { logger } from "@/utils/logger";
import { interviewTypeSchema } from "@/lib/interview/domain";
import { isCuratedCompany } from "@/lib/company-options";

const onboardingSchema = z.object({
  onboardingRole: z.string().trim().min(1, "Target role is required").max(200, "Target role is too long"),
  onboardingLevel: z.string().trim().min(1, "Experience level is required").max(64, "Experience level is too long"),
  onboardingCompany: z.string().trim().max(100).refine(
    (value) => value === "" || isCuratedCompany(value),
    "Choose a company from the curated list",
  ).optional().default(""),
  onboardingGoal: z.string().trim().min(1, "Primary goal is required").max(200, "Primary goal is too long"),
  preferredInterviewType: z.string().transform((value, ctx) => {
    const parsed = interviewTypeSchema.safeParse(value);
    if (!parsed.success) {
      ctx.addIssue({ code: "custom", message: "Invalid interview type" });
      return z.NEVER;
    }
    return parsed.data;
  }),
});

export async function GET() {
  try {
    const authUser = await getSessionUserIdentity();
    if (!authUser) {
      return unauthorizedError();
    }

    const where = { id: authUser.userId };

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

export const PUT = withCsrfProtection(async (req: Request) => {
  try {
    const authUser = await getSessionUserIdentity();
    if (!authUser) {
      return unauthorizedError();
    }

    const parsed = await parseJsonBody(req, onboardingSchema);
    if (!parsed.ok) {
      return parsed.response;
    }

    const values = parsed.data;
    const onboardingRole = values.onboardingRole.trim();

    const where = { id: authUser.userId };

    const updated = await prisma.user
      .update({
        where,
        data: {
          onboardingCompletedAt: new Date(),
          onboardingRole,
          onboardingLevel: values.onboardingLevel,
          onboardingCompany: values.onboardingCompany || null,
          onboardingGoal: values.onboardingGoal,
          preferredInterviewType: values.preferredInterviewType,
          isFirstLogin: false,
        },
        select: { id: true },
      })
      .catch((error) => {
        if (error instanceof Error && "code" in error && error.code === "P2025") {
          return null;
        }
        throw error;
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
});
