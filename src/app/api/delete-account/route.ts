import { prisma } from "@/lib/prisma";
import {
  apiJson,
  badRequestError,
  internalServerError,
  notFoundError,
  unauthorizedError,
} from "@/lib/api-response";
import { getServerAuthSession } from "@/lib/server-auth";
import { recordSecurityEvent } from "@/lib/account-security";
import { extractRequestContext } from "@/lib/security";
import { verifyCredentialPassword } from "@/lib/password";
import { withCsrfProtection } from "@/lib/route-security";
import { z } from "zod/v4";
import { logger } from "@/utils/logger";

const deleteAccountSchema = z.object({
  confirm: z.literal("DELETE"),
  currentPassword: z
    .string()
    .min(1, "Current password is required to delete your account."),
});

export const DELETE = withCsrfProtection(async (req: Request) => {
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.email) {
      return unauthorizedError();
    }

    const body = await req.json();
    const parsed = deleteAccountSchema.safeParse(body);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message || "Invalid input";
      return badRequestError(firstError);
    }

    const { currentPassword } = parsed.data;

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return notFoundError("User not found.");
    }

    // In Better Auth, passwords are stored in the Account table
    const account = await prisma.account.findFirst({
      where: { userId: user.id, providerId: "credential" },
    });

    if (!account?.password) {
      return badRequestError(
        "Password-based account deletion is not available for this account."
      );
    }

    const isValid = await verifyCredentialPassword({
      password: currentPassword,
      hash: account.password,
    });
    if (!isValid) {
      return badRequestError("Current password is incorrect.");
    }

    const { ipHash, userAgent } = extractRequestContext(req.headers);

    await prisma.user.delete({
      where: { id: user.id },
    });

    await recordSecurityEvent({
      type: "ACCOUNT_DELETED",
      userId: null,
      email: user.email,
      ipHash,
      userAgent,
      metadata: { reason: "account_deleted" },
    });

    return apiJson({ success: true });
  } catch (error) {
    logger.error("Delete account error:", {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalServerError();
  }
});
