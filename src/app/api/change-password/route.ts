import { prisma } from "@/lib/prisma";
import { recordSecurityEvent, revokeUserSessions } from "@/lib/account-security";
import { getCurrentSession } from "@/lib/server-auth";
import { getServerAuthSession } from "@/lib/server-auth";
import { hashCredentialPassword, verifyCredentialPassword } from "@/lib/password";
import { z } from "zod/v4";
import { apiJson, badRequestError, internalServerError, unauthorizedError } from "@/lib/api-response";
import { createRateLimiter } from "@/lib/rate-limit";
import { withCsrfProtection } from "@/lib/route-security";
import { logger } from "@/utils/logger";

const changePasswordSchema = z.object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z
        .string()
        .min(8, "Password must be at least 8 characters")
        .max(128, "Password is too long")
        .refine((pw) => /[A-Z]/.test(pw), "Password must contain an uppercase letter")
        .refine((pw) => /[a-z]/.test(pw), "Password must contain a lowercase letter")
        .refine((pw) => /[0-9]/.test(pw), "Password must contain a number")
        .refine((pw) => /[^A-Za-z0-9]/.test(pw), "Password must contain a special character"),
});

const changePasswordLimiter = createRateLimiter("change-password", 15 * 60 * 1000, 5);

export const POST = withCsrfProtection(async (req: Request) => {
    try {
        const session = await getServerAuthSession();
        if (!session?.user?.email) {
            return unauthorizedError();
        }

        if (await changePasswordLimiter.isLimited(session.user.id)) {
            return badRequestError("Too many password change attempts. Please try again later.");
        }

        const currentSession = await getCurrentSession();

        const body = await req.json();
        const result = changePasswordSchema.safeParse(body);

        if (!result.success) {
            const firstError = result.error.issues[0]?.message || "Invalid input";
            return badRequestError(firstError);
        }

        const { currentPassword, newPassword } = result.data;

        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
        });

        if (!user) {
            return unauthorizedError();
        }

        // In Better Auth, passwords are stored in the Account table
        const account = await prisma.account.findFirst({
            where: { userId: user.id, providerId: "credential" },
        });

        if (!account?.password) {
            return badRequestError("Password change is not available for this account.");
        }

        // Verify current password
        const isValid = await verifyCredentialPassword({
            password: currentPassword,
            hash: account.password,
        });
        if (!isValid) {
            return badRequestError("Current password is incorrect.");
        }

        // Prevent reusing the same password
        const isSame = await verifyCredentialPassword({
            password: newPassword,
            hash: account.password,
        });
        if (isSame) {
            return badRequestError("New password must be different from current password.");
        }

        // Hash and save new password in Account
        const newHash = await hashCredentialPassword(newPassword);
        await prisma.account.update({
            where: { id: account.id },
            data: { password: newHash },
        });

        // Update user metadata
        await prisma.user.update({
            where: { id: user.id },
            data: {
                lastPasswordChangedAt: new Date(),
                failedLoginCount: 0,
                lockedUntil: null,
            },
        });

        const revokedSessions = await revokeUserSessions({
            userId: user.id,
            excludeSessionToken: currentSession?.token,
            reason: "password_changed",
        });

        await recordSecurityEvent({
            type: "PASSWORD_CHANGED",
            userId: user.id,
            email: user.email,
            metadata: { revokedSessions },
        });

        return apiJson({ success: true, revokedSessions });
    } catch (error) {
        logger.error("Change password error:", {
            error: error instanceof Error ? error.message : String(error),
        });
        return internalServerError();
    }
});
