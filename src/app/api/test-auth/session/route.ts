import { prisma } from "@/lib/prisma";
import { apiError, badRequestError, internalServerError } from "@/lib/api-response";
import { withCsrfProtection } from "@/lib/route-security";
import { E2E_TEST_AUTH_COOKIE, encodeE2ETestIdentity, isTestAuthEnabled } from "@/lib/test-auth";
import { logger } from "@/utils/logger";
import { NextResponse } from "next/server";
import { z } from "zod/v4";

const sessionSchema = z.object({
  userId: z.string().min(1).default("e2e-user"),
  email: z.email().default("e2e@example.com"),
  name: z.string().min(1).default("E2E User"),
  onboardingCompleted: z.boolean().default(true),
});

function rejectIfDisabled() {
  if (!isTestAuthEnabled()) {
    return apiError("Test auth is only available in test mode", 403);
  }

  return null;
}

export const POST = withCsrfProtection(async (req: Request) => {
  const disabled = rejectIfDisabled();
  if (disabled) return disabled;

  try {
    const parsed = sessionSchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return badRequestError(parsed.error.issues[0]?.message || "Invalid test auth payload");
    }

    const { userId, email, name, onboardingCompleted } = parsed.data;

    const user = await prisma.user.upsert({
      where: { email },
      update: {
        name,
        emailVerified: true,
        onboardingCompletedAt: onboardingCompleted ? new Date() : null,
        isFirstLogin: false,
      },
      create: {
        id: userId,
        name,
        email,
        emailVerified: true,
        onboardingCompletedAt: onboardingCompleted ? new Date() : null,
        isFirstLogin: false,
      },
      select: {
        id: true,
        email: true,
      },
    });

    const response = NextResponse.json({ ok: true, userId: user.id, email: user.email });
    response.cookies.set(E2E_TEST_AUTH_COOKIE, await encodeE2ETestIdentity({
      userId: user.id,
      email: user.email,
      onboardingCompletedAt: onboardingCompleted ? new Date().toISOString() : null,
    }), {
      httpOnly: true,
      sameSite: "strict",
      secure: new URL(req.url).protocol === "https:",
      path: "/",
    });
    return response;
  } catch (error) {
    logger.error("Failed to create test auth session", {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalServerError();
  }
});

export const DELETE = withCsrfProtection(async (req: Request) => {
  const disabled = rejectIfDisabled();
  if (disabled) return disabled;

  void req;

  const response = NextResponse.json({ ok: true });
  response.cookies.delete(E2E_TEST_AUTH_COOKIE);
  return response;
});
