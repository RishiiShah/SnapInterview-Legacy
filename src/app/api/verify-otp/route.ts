import { prisma } from "@/lib/prisma";
import { recordSecurityEvent } from "@/lib/account-security";
import { csrfRejectIfInvalid } from "@/lib/csrf";
import { normalizeEmail, verifyOneTimeCode } from "@/lib/security";
import { z } from "zod/v4";
import { apiError, apiJson, badRequestError, internalServerError, notFoundError } from "@/lib/api-response";

const verifySchema = z.object({
    email: z.email("Invalid email address"),
    otp: z.string().length(6, "OTP must be 6 digits"),
});

const MAX_OTP_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000; // 15 mins

export async function POST(req: Request) {
    try {
        const csrfError = csrfRejectIfInvalid(req);
        if (csrfError) return csrfError;

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
            // Clean up expired record
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
                data: {
                    attemptCount,
                    lockedUntil,
                },
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
            // Clean up pending record
            await prisma.pendingUser.deleteMany({ where: { email: normalizedEmail } });
            return apiError("An account with this email already exists. Please log in.", 409);
        }

        // Create the real user from pending data
        const user = await prisma.user.create({
            data: {
                name: pendingUser.name,
                email: normalizedEmail,
                passwordHash: pendingUser.passwordHash,
                emailVerified: new Date(),
                isFirstLogin: true,
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
        console.error("OTP verification error:", error);
        return internalServerError();
    }
}
