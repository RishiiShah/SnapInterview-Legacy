import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod/v4";

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

export async function POST(req: Request) {
    try {
        // CSRF protection: validate Origin header
        const origin = req.headers.get("origin");
        const allowedOrigin = process.env.NEXTAUTH_URL || "http://localhost:3000";
        if (!origin || origin !== allowedOrigin) {
            return NextResponse.json(
                { error: "Forbidden" },
                { status: 403 }
            );
        }

        const body = await req.json();
        const result = schema.safeParse(body);

        if (!result.success) {
            const firstError = result.error.issues[0]?.message || "Invalid input";
            return NextResponse.json({ error: firstError }, { status: 400 });
        }

        const { email, otp, newPassword } = result.data;
        const normalizedEmail = email.toLowerCase();

        // Find the verification token
        const token = await prisma.verificationToken.findFirst({
            where: { identifier: `reset:${normalizedEmail}` },
        });

        if (!token) {
            return NextResponse.json(
                { error: "No reset request found. Please request a new code." },
                { status: 404 }
            );
        }

        // Check expiry
        if (new Date() > token.expires) {
            await prisma.verificationToken.deleteMany({
                where: { identifier: `reset:${normalizedEmail}` },
            });
            return NextResponse.json(
                { error: "Reset code has expired. Please request a new one." },
                { status: 410 }
            );
        }

        // --- OTP Brute force prevention (Max 5 attempts) ---
        const resetRateLimit = new Map<string, { count: number; lockoutUntil: number }>();
        const MAX_OTP_ATTEMPTS = 5;
        const LOCKOUT_MS = 15 * 60 * 1000; // 15 mins

        const now = Date.now();
        let limitEntry = resetRateLimit.get(normalizedEmail);

        if (limitEntry && now < limitEntry.lockoutUntil) {
            return NextResponse.json(
                { error: "Too many failed attempts. Try again later." },
                { status: 429 }
            );
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

                return NextResponse.json(
                    { error: "Maximum attempts reached. Reset cancelled. Please request a new code." },
                    { status: 429 }
                );
            }

            resetRateLimit.set(normalizedEmail, limitEntry);

            return NextResponse.json(
                { error: `Invalid code. ${MAX_OTP_ATTEMPTS - limitEntry.count} attempts left.` },
                { status: 400 }
            );
        }

        // On success, clear the rate limit
        resetRateLimit.delete(normalizedEmail);

        // Find user
        const user = await prisma.user.findUnique({
            where: { email: normalizedEmail },
        });

        if (!user) {
            return NextResponse.json(
                { error: "Account not found." },
                { status: 404 }
            );
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

        return NextResponse.json({ success: true }, { status: 200 });
    } catch (error) {
        console.error("Reset password error:", error);
        return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
    }
}
