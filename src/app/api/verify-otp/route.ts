import { prisma } from "@/lib/prisma";
import { recordSecurityEvent } from "@/lib/account-security";
import { csrfRejectIfInvalid } from "@/lib/csrf";
import { normalizeEmail, verifyOneTimeCode, extractRequestContext } from "@/lib/security";
import { z } from "zod/v4";
import { apiError, apiJson, badRequestError, internalServerError, notFoundError } from "@/lib/api-response";
import { createRateLimiter } from "@/lib/rate-limit";
import { logger } from "@/utils/logger";

const verifySchema = z.object({
    email: z.email("Invalid email address"),
    otp: z.string().length(6, "OTP must be 6 digits"),
});

const MAX_OTP_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000; // 15 mins

// IP-based Postgres-backed distributed rate limiter
const otpVerifyLimiter = createRateLimiter("otp-verify", 60 * 1000, 10); // 10 per minute per IP

export async function POST(req: Request) {
    try {
        const csrfError = csrfRejectIfInvalid(req);
        if (csrfError) return csrfError;

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
        const pendingUser = await prisma.pendingUser.findFirst({
            where: { email: normalizedEmail },
            orderBy: { createdAt: "desc" },
        });

        if (!pendingUser) {
            return notFoundError("No pending verification found. Please sign up again.");
        }

        // Check if OTP has expired
        if (new Date() > pendingUser.expiresAt) {
            await prisma.pendingUser.delete({ where: { id: pendingUser.id } });
            return apiError("OTP has expired. Please sign up again.", 410);
        }

        // --- OTP Brute force prevention ---
        if (pendingUser.lockedUntil && pendingUser.lockedUntil > new Date()) {
            return apiError("Too many failed attempts. Try again later.", 429);
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

            if (lockedUntil) {
                return apiError("Maximum attempts reached. Registration cancelled. Please sign up again.", 429);
            }

            return badRequestError(`Invalid OTP. ${MAX_OTP_ATTEMPTS - attemptCount} attempts left.`);
        }

        // Check if a user with this email was created in the meantime
        const existingUser = await prisma.user.findUnique({
            where: { email: normalizedEmail },
        });

        if (existingUser) {
            await prisma.pendingUser.deleteMany({ where: { email: normalizedEmail } });
            return apiError("An account with this email already exists. Please log in.", 409);
        }

        // Create the real user from pending data
        // Better Auth stores passwords in the Account table (not User)
        const user = await prisma.user.create({
            data: {
                name: pendingUser.name,
                email: normalizedEmail,
                emailVerified: true, // Better Auth uses boolean (not Date)
                isFirstLogin: true,
            },
        });

        // Create credential Account record — this is where Better Auth stores passwords
        await prisma.account.create({
            data: {
                userId: user.id,
                accountId: user.id,
                providerId: "credential",
                password: pendingUser.passwordHash,
            },
        });

        await recordSecurityEvent({
            type: "REGISTRATION_OTP_VERIFIED",
            userId: user.id,
            email: user.email,
        });

        // Clean up all pending records for this email
        await prisma.pendingUser.deleteMany({ where: { email: normalizedEmail } });

        return apiJson({ id: user.id, name: user.name, email: user.email }, 201);
    } catch (error) {
        logger.error("OTP verification error:", {
            error: error instanceof Error ? error.message : String(error),
        });
        return internalServerError();
    }
}
