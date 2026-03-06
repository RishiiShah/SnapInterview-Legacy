import { prisma } from "@/lib/prisma";
import { csrfRejectIfInvalid } from "@/lib/csrf";
import bcrypt from "bcryptjs";
import { z } from "zod/v4";
import { apiError, apiJson, badRequestError, internalServerError, notFoundError } from "@/lib/api-response";

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

// --- OTP Brute force prevention (module scope so state persists across requests) ---
const resetRateLimit = new Map<string, { count: number; lockoutUntil: number }>();
const MAX_OTP_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000; // 15 mins

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
        const normalizedEmail = email.toLowerCase();

        // Find the verification token
        const token = await prisma.verificationToken.findFirst({
            where: { identifier: `reset:${normalizedEmail}` },
        });

        if (!token) {
            return notFoundError("No reset request found. Please request a new code.");
        }

        // Check expiry
        if (new Date() > token.expires) {
            await prisma.verificationToken.deleteMany({
                where: { identifier: `reset:${normalizedEmail}` },
            });
            return apiError("Reset code has expired. Please request a new one.", 410);
        }

        // --- OTP Brute force prevention ---

        const now = Date.now();
        let limitEntry = resetRateLimit.get(normalizedEmail);

        if (limitEntry && now < limitEntry.lockoutUntil) {
            return apiError("Too many failed attempts. Try again later.", 429);
        }

        // Validate OTP
        if (token.token !== otp) {
            // Increment failed attempts
            if (!limitEntry || now > limitEntry.lockoutUntil) {
                limitEntry = { count: 1, lockoutUntil: 0 };
            } else {
                limitEntry.count++;
            }

            if (limitEntry.count >= MAX_OTP_ATTEMPTS) {
                limitEntry.lockoutUntil = now + LOCKOUT_MS;
                resetRateLimit.set(normalizedEmail, limitEntry);

                // Delete the verification token so they have to request a new one
                await prisma.verificationToken.deleteMany({
                    where: { identifier: `reset:${normalizedEmail}` },
                });

                return apiError("Maximum attempts reached. Reset cancelled. Please request a new code.", 429);
            }

            resetRateLimit.set(normalizedEmail, limitEntry);

            return badRequestError(`Invalid code. ${MAX_OTP_ATTEMPTS - limitEntry.count} attempts left.`);
        }

        // On success, clear the rate limit
        resetRateLimit.delete(normalizedEmail);

        // Find user
        const user = await prisma.user.findUnique({
            where: { email: normalizedEmail },
        });

        if (!user) {
            return notFoundError("Account not found.");
        }

        // Hash and update password
        const passwordHash = await bcrypt.hash(newPassword, 12);
        await prisma.user.update({
            where: { id: user.id },
            data: { passwordHash },
        });

        // Clean up token
        await prisma.verificationToken.deleteMany({
            where: { identifier: `reset:${normalizedEmail}` },
        });

        return apiJson({ success: true });
    } catch (error) {
        console.error("Reset password error:", error);
        return internalServerError();
    }
}
