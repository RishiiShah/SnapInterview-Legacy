import { prisma } from "@/lib/prisma";
import { csrfRejectIfInvalid } from "@/lib/csrf";
import { z } from "zod/v4";
import { apiError, apiJson, badRequestError, internalServerError, notFoundError } from "@/lib/api-response";

const verifySchema = z.object({
    email: z.email("Invalid email address"),
    otp: z.string().length(6, "OTP must be 6 digits"),
});

// --- OTP Brute force prevention (module scope so state persists across requests) ---
const verifyRateLimit = new Map<string, { count: number; lockoutUntil: number }>();
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
        const normalizedEmail = email.toLowerCase();

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

        const now = Date.now();
        let limitEntry = verifyRateLimit.get(normalizedEmail);

        if (limitEntry && now < limitEntry.lockoutUntil) {
            return apiError("Too many failed attempts. Try again later.", 429);
        }

        // Validate OTP
        if (pendingUser.otp !== otp) {
            // Increment failed attempts
            if (!limitEntry || now > limitEntry.lockoutUntil) {
                limitEntry = { count: 1, lockoutUntil: 0 };
            } else {
                limitEntry.count++;
            }

            if (limitEntry.count >= MAX_OTP_ATTEMPTS) {
                limitEntry.lockoutUntil = now + LOCKOUT_MS;
                verifyRateLimit.set(normalizedEmail, limitEntry);

                // Delete the pending user so they have to restart the flow
                await prisma.pendingUser.delete({ where: { id: pendingUser.id } });

                return apiError("Maximum attempts reached. Registration cancelled. Please sign up again.", 429);
            }

            verifyRateLimit.set(normalizedEmail, limitEntry);

            return badRequestError(`Invalid OTP. ${MAX_OTP_ATTEMPTS - limitEntry.count} attempts left.`);
        }

        // On success, clear the rate limit
        verifyRateLimit.delete(normalizedEmail);

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

        // Clean up all pending records for this email
        await prisma.pendingUser.deleteMany({ where: { email: normalizedEmail } });

        return apiJson({ id: user.id, name: user.name, email: user.email }, 201);
    } catch (error) {
        console.error("OTP verification error:", error);
        return internalServerError();
    }
}
