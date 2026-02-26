import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod/v4";

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
        // CSRF protection
        const origin = req.headers.get("origin");
        const allowedOrigin = process.env.NEXTAUTH_URL || "http://localhost:3000";
        if (!origin || origin !== allowedOrigin) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const body = await req.json();
        const result = verifySchema.safeParse(body);

        if (!result.success) {
            const firstError = result.error.issues[0]?.message || "Invalid input";
            return NextResponse.json({ error: firstError }, { status: 400 });
        }

        const { email, otp } = result.data;
        const normalizedEmail = email.toLowerCase();

        // Find the pending user record
        const pendingUser = await prisma.pendingUser.findFirst({
            where: { email: normalizedEmail },
            orderBy: { createdAt: "desc" },
        });

        if (!pendingUser) {
            return NextResponse.json(
                { error: "No pending verification found. Please sign up again." },
                { status: 404 }
            );
        }

        // Check if OTP has expired
        if (new Date() > pendingUser.expiresAt) {
            // Clean up expired record
            await prisma.pendingUser.delete({ where: { id: pendingUser.id } });
            return NextResponse.json(
                { error: "OTP has expired. Please sign up again." },
                { status: 410 }
            );
        }

        // --- OTP Brute force prevention ---

        const now = Date.now();
        let limitEntry = verifyRateLimit.get(normalizedEmail);

        if (limitEntry && now < limitEntry.lockoutUntil) {
            return NextResponse.json(
                { error: "Too many failed attempts. Try again later." },
                { status: 429 }
            );
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

                return NextResponse.json(
                    { error: "Maximum attempts reached. Registration cancelled. Please sign up again." },
                    { status: 429 }
                );
            }

            verifyRateLimit.set(normalizedEmail, limitEntry);

            return NextResponse.json(
                { error: `Invalid OTP. ${MAX_OTP_ATTEMPTS - limitEntry.count} attempts left.` },
                { status: 400 }
            );
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
            return NextResponse.json(
                { error: "An account with this email already exists. Please log in." },
                { status: 409 }
            );
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

        return NextResponse.json(
            { id: user.id, name: user.name, email: user.email },
            { status: 201 }
        );
    } catch (error) {
        console.error("OTP verification error:", error);
        return NextResponse.json(
            { error: "Something went wrong" },
            { status: 500 }
        );
    }
}
