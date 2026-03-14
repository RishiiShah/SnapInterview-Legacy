import { prisma } from "@/lib/prisma";
import { recordSecurityEvent } from "@/lib/account-security";
import { sendOtpEmail } from "@/lib/email";
import { csrfRejectIfInvalid } from "@/lib/csrf";
import { z } from "zod/v4";
import { apiError, apiJson, internalServerError } from "@/lib/api-response";
import { extractRequestContext, generateNumericCode, hashOneTimeCode, normalizeEmail } from "@/lib/security";
import { createRateLimiter } from "@/lib/rate-limit";

const schema = z.object({
    email: z.email("Invalid email address"),
});

const WINDOW_MS = 15 * 60 * 1000;
const MAX_REQUESTS = 3;
const forgotPasswordLimiter = createRateLimiter("forgot-password", 60 * 1000, 6);

export async function POST(req: Request) {
    try {
        const csrfError = csrfRejectIfInvalid(req);
        if (csrfError) return csrfError;

        const body = await req.json();
        const result = schema.safeParse(body);

        if (!result.success) {
            return apiError("Invalid email address.", 400);
        }

        const email = normalizeEmail(result.data.email);
        const { ipHash, userAgent } = extractRequestContext(req.headers);
        const limiterKey = `${email}:${ipHash ?? "unknown"}`;

        if (await forgotPasswordLimiter.isLimited(limiterKey)) {
            return apiError("Too many reset requests. Please try again later.", 429);
        }

        // Always respond with success to prevent email enumeration
        const user = await prisma.user.findUnique({ where: { email } });

        // In Better Auth, check if the user has a credential account (i.e., password-based)
        const hasCredentialAccount = user
            ? !!(await prisma.account.findFirst({
                  where: { userId: user.id, providerId: "credential" },
                  select: { id: true },
              }))
            : false;

        if (user && hasCredentialAccount) {
            const recentCount = await prisma.passwordResetCode.count({
                where: {
                    email,
                    createdAt: {
                        gte: new Date(Date.now() - WINDOW_MS),
                    },
                },
            });

            if (recentCount >= MAX_REQUESTS) {
                return apiError("Too many reset requests. Please try again later.", 429);
            }

            // Generate 6-digit OTP
            const otp = generateNumericCode();
            const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

            await prisma.passwordResetCode.updateMany({
                where: { email, usedAt: null },
                data: { usedAt: new Date() },
            });

            await prisma.passwordResetCode.create({
                data: {
                    userId: user.id,
                    email,
                    codeHash: hashOneTimeCode(otp),
                    expiresAt,
                    ipHash,
                    userAgent,
                },
            });

            // Keep a uniform response even if delivery fails to avoid account enumeration leaks.
            try {
                await sendOtpEmail(email, otp);
            } catch (emailError) {
                console.error("Failed to send password reset email:", emailError);
            }

            await recordSecurityEvent({
                type: "PASSWORD_RESET_REQUESTED",
                userId: user.id,
                email,
                ipHash,
                userAgent,
            });
        }

        // Always return success (prevent enumeration)
        return apiJson({
            success: true,
            message: "If an account with that email exists, a reset code has been sent.",
        });
    } catch (error) {
        console.error("Forgot password error:", error);
        return internalServerError();
    }
}
