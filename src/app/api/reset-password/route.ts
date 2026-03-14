import { prisma } from "@/lib/prisma";
import { recordSecurityEvent, revokeUserSessions } from "@/lib/account-security";
import { csrfRejectIfInvalid } from "@/lib/csrf";
import { normalizeEmail, verifyOneTimeCode } from "@/lib/security";
import { hashCredentialPassword } from "@/lib/password";
import { z } from "zod/v4";
import { apiError, apiJson, badRequestError, internalServerError, notFoundError } from "@/lib/api-response";
import { createRateLimiter } from "@/lib/rate-limit";

const schema = z.object({
    email: z.email("Invalid email address"),
    otp: z.string().length(6, "OTP must be 6 digits"),
    newPassword: z
        .string()
        .min(8, "Password must be at least 8 characters")
        .max(128, "Password is too long")
        .refine((pw) => /[A-Z]/.test(pw), "Password must contain an uppercase letter")
        .refine((pw) => /[a-z]/.test(pw), "Password must contain a lowercase letter")
        .refine((pw) => /[0-9]/.test(pw), "Password must contain a number")
        .refine((pw) => /[^A-Za-z0-9]/.test(pw), "Password must contain a special character"),
});

const MAX_OTP_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000; // 15 mins
const resetPasswordLimiter = createRateLimiter("reset-password", 60 * 1000, 10);

export async function POST(req: Request) {
    try {
        const csrfError = csrfRejectIfInvalid(req);
        if (csrfError) return csrfError;

        const body = await req.json();
        const result = schema.safeParse(body);

        if (!result.success) {
            const firstError = result.error.issues[0]?.message || "Invalid input";
            return badRequestError(firstError);
        }

        const { email, otp, newPassword } = result.data;
        const normalizedEmail = normalizeEmail(email);

        if (await resetPasswordLimiter.isLimited(normalizedEmail)) {
            return apiError("Too many requests. Please try again later.", 429);
        }

        // Find the verification token
        const token = await prisma.passwordResetCode.findFirst({
            where: { email: normalizedEmail, usedAt: null },
            orderBy: { createdAt: "desc" },
        });

        if (!token) {
            return notFoundError("No reset request found. Please request a new code.");
        }

        // Check expiry
        if (new Date() > token.expiresAt) {
            await prisma.passwordResetCode.updateMany({
                where: { email: normalizedEmail, usedAt: null },
                data: { usedAt: new Date() },
            });
            return apiError("Reset code has expired. Please request a new one.", 410);
        }

        if (token.lockedUntil && token.lockedUntil > new Date()) {
            return apiError("Too many failed attempts. Try again later.", 429);
        }

        // Validate OTP
        if (!verifyOneTimeCode(otp, token.codeHash)) {
            const attemptCount = token.attemptCount + 1;
            const lockedUntil =
                attemptCount >= MAX_OTP_ATTEMPTS ? new Date(Date.now() + LOCKOUT_MS) : null;

            await prisma.passwordResetCode.update({
                where: { id: token.id },
                data: {
                    attemptCount,
                    lockedUntil,
                    ...(lockedUntil ? { usedAt: new Date() } : {}),
                },
            });

            if (lockedUntil) {
                return apiError("Maximum attempts reached. Reset cancelled. Please request a new code.", 429);
            }

            return badRequestError(`Invalid code. ${MAX_OTP_ATTEMPTS - attemptCount} attempts left.`);
        }

        // Find user
        const user = await prisma.user.findUnique({
            where: { email: normalizedEmail },
        });

        if (!user) {
            return notFoundError("Account not found.");
        }

        // In Better Auth, passwords are stored in the Account table
        const account = await prisma.account.findFirst({
            where: { userId: user.id, providerId: "credential" },
        });

        if (!account) {
            return notFoundError("Account not found.");
        }

        // Hash and update password in Account
        const newPasswordHash = await hashCredentialPassword(newPassword);
        await prisma.account.update({
            where: { id: account.id },
            data: { password: newPasswordHash },
        });

        await prisma.user.update({
            where: { id: user.id },
            data: {
                lastPasswordChangedAt: new Date(),
                failedLoginCount: 0,
                lockedUntil: null,
            },
        });

        await revokeUserSessions({
            userId: user.id,
            reason: "password_reset",
        });

        // Clean up token
        await prisma.passwordResetCode.updateMany({
            where: { email: normalizedEmail, usedAt: null },
            data: { usedAt: new Date() },
        });

        await recordSecurityEvent({
            type: "PASSWORD_RESET_COMPLETED",
            userId: user.id,
            email: normalizedEmail,
        });

        return apiJson({ success: true });
    } catch (error) {
        console.error("Reset password error:", error);
        return internalServerError();
    }
}
