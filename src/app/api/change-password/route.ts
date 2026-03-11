import { revokeUserSessions, recordSecurityEvent } from "@/lib/account-security";
import { getCurrentSessionRecord } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";
import { csrfRejectIfInvalid } from "@/lib/csrf";
import { getServerAuthSession } from "@/lib/server-auth";
import bcrypt from "bcryptjs";
import { z } from "zod/v4";
import { apiJson, badRequestError, internalServerError, unauthorizedError } from "@/lib/api-response";

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

export async function POST(req: Request) {
    try {
        const csrfError = csrfRejectIfInvalid(req);
        if (csrfError) return csrfError;

        const session = await getServerAuthSession();
        if (!session?.user?.email) {
            return unauthorizedError();
        }

        const currentSession = await getCurrentSessionRecord(req);

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

        if (!user || !user.passwordHash) {
            return badRequestError("Password change is not available for this account.");
        }

        // Verify current password
        const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
        if (!isValid) {
            return badRequestError("Current password is incorrect.");
        }

        // Prevent reusing the same password
        const isSame = await bcrypt.compare(newPassword, user.passwordHash);
        if (isSame) {
            return badRequestError("New password must be different from current password.");
        }

        // Hash and save new password
        const newHash = await bcrypt.hash(newPassword, 12);
        await prisma.user.update({
            where: { id: user.id },
            data: {
                passwordHash: newHash,
                lastPasswordChangedAt: new Date(),
                failedLoginCount: 0,
                lockedUntil: null,
            },
        });

        const revokedSessions = await revokeUserSessions({
            userId: user.id,
            excludeSessionToken: currentSession?.sessionToken,
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
        console.error("Change password error:", error);
        return internalServerError();
    }
}
