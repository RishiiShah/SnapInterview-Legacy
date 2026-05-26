import { prisma } from "@/lib/prisma";
import { recordSecurityEvent } from "@/lib/account-security";
import { normalizeEmail, verifyOneTimeCode, extractRequestContext } from "@/lib/security";
import { z } from "zod/v4";
import { apiError, apiJson, badRequestError, internalServerError } from "@/lib/api-response";
import { createRateLimiter } from "@/lib/rate-limit";
import { withCsrfProtection } from "@/lib/route-security";
import { logger } from "@/utils/logger";

const verifySchema = z.object({
    email: z.email("Invalid email address"),
    otp: z.string().length(6, "OTP must be 6 digits"),
});

const MAX_OTP_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000; // 15 mins
const GENERIC_VERIFICATION_ERROR = "Invalid or expired verification code.";

// IP-based Postgres-backed distributed rate limiter
const otpVerifyLimiter = createRateLimiter("otp-verify", 60 * 1000, 10); // 10 per minute per IP

export const POST = withCsrfProtection(async (req: Request) => {
    try {
        const { ipHash } = extractRequestContext(req.headers);
        const rateLimitKey = ipHash ?? "unknown";
        if (await otpVerifyLimiter.isLimited(rateLimitKey)) {
            return apiError("Too many requests. Please try again later.", 429);
        }

        const body = await req.json();
        const result = verifySchema.safeParse(body);

        if (!result.success) {
            const firstError = result.error.issues[0]?.message || "Invalid input";
            return badRequestError(firstError);
        }

        const { email, otp } = result.data;
        const normalizedEmail = normalizeEmail(email);

        // Find the pending user record
        const pendingUser = await prisma.pendingUser.findUnique({
            where: { email: normalizedEmail },
        });

        if (!pendingUser) {
            return badRequestError(GENERIC_VERIFICATION_ERROR);
        }

        // Check if OTP has expired
        if (new Date() > pendingUser.expiresAt) {
            await prisma.pendingUser.delete({ where: { email: normalizedEmail } });
            return badRequestError(GENERIC_VERIFICATION_ERROR);
        }

        // --- OTP Brute force prevention ---
        if (pendingUser.lockedUntil && pendingUser.lockedUntil > new Date()) {
            return badRequestError(GENERIC_VERIFICATION_ERROR);
        }

        // Validate OTP
        if (!verifyOneTimeCode(otp, pendingUser.otpHash)) {
            const attemptCount = pendingUser.attemptCount + 1;
            const lockedUntil =
                attemptCount >= MAX_OTP_ATTEMPTS ? new Date(Date.now() + LOCKOUT_MS) : null;

            await prisma.pendingUser.update({
                where: { id: pendingUser.id },
                data: { attemptCount, lockedUntil },
            });

            await recordSecurityEvent({
                type: "REGISTRATION_OTP_FAILED",
                email: normalizedEmail,
                metadata: { remainingAttempts: Math.max(0, MAX_OTP_ATTEMPTS - attemptCount) },
            });

            return badRequestError(GENERIC_VERIFICATION_ERROR);
        }

        const { user, recoveredCredentialAccount } = await prisma.$transaction(async (tx) => {
            const existingUser = await tx.user.findUnique({
                where: { email: normalizedEmail },
            });

            if (existingUser) {
                const existingCredentialAccount = await tx.account.findFirst({
                    where: { userId: existingUser.id, providerId: "credential" },
                    select: { id: true },
                });

                if (existingCredentialAccount) {
                    await tx.pendingUser.delete({ where: { email: normalizedEmail } });
                    return { user: null, recoveredCredentialAccount: false };
                }

                const updatedUser = await tx.user.update({
                    where: { id: existingUser.id },
                    data: {
                        name: existingUser.name || pendingUser.name,
                        emailVerified: true,
                        isFirstLogin: true,
                    },
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                });

                await tx.account.create({
                    data: {
                        userId: updatedUser.id,
                        accountId: updatedUser.id,
                        providerId: "credential",
                        password: pendingUser.passwordHash,
                    },
                });

                await tx.pendingUser.delete({ where: { email: normalizedEmail } });
                return { user: updatedUser, recoveredCredentialAccount: true };
            }

            const createdUser = await tx.user.create({
                data: {
                    name: pendingUser.name,
                    email: normalizedEmail,
                    emailVerified: true,
                    isFirstLogin: true,
                },
                select: {
                    id: true,
                    name: true,
                    email: true,
                },
            });

            await tx.account.create({
                data: {
                    userId: createdUser.id,
                    accountId: createdUser.id,
                    providerId: "credential",
                    password: pendingUser.passwordHash,
                },
            });

            await tx.pendingUser.delete({ where: { email: normalizedEmail } });
            return { user: createdUser, recoveredCredentialAccount: false };
        });

        if (!user) {
            return badRequestError(GENERIC_VERIFICATION_ERROR);
        }

        await recordSecurityEvent({
            type: "REGISTRATION_OTP_VERIFIED",
            userId: user.id,
            email: user.email,
            metadata: recoveredCredentialAccount ? { recoveredCredentialAccount: true } : undefined,
        });

        return apiJson({ id: user.id, name: user.name, email: user.email }, 201);
    } catch (error) {
        logger.error("OTP verification error:", {
            error: error instanceof Error ? error.message : String(error),
        });
        return internalServerError();
    }
});
