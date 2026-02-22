import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendOtpEmail } from "@/lib/email";
import crypto from "crypto";
import { z } from "zod/v4";

const schema = z.object({
    email: z.email("Invalid email address"),
});

// Rate limit: 3 reset requests per email per 15 minutes
const rateLimit = new Map<string, { count: number; resetTime: number }>();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_REQUESTS = 3;

function isRateLimited(key: string): boolean {
    const now = Date.now();
    const entry = rateLimit.get(key);
    if (!entry || now > entry.resetTime) {
        rateLimit.set(key, { count: 1, resetTime: now + WINDOW_MS });
        return false;
    }
    entry.count++;
    return entry.count > MAX_REQUESTS;
}

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
            return NextResponse.json({ error: "Invalid email address." }, { status: 400 });
        }

        const email = result.data.email.toLowerCase();

        // Rate limit by email
        if (isRateLimited(email)) {
            return NextResponse.json(
                { error: "Too many reset requests. Please try again later." },
                { status: 429 }
            );
        }

        // Always respond with success to prevent email enumeration
        const user = await prisma.user.findUnique({ where: { email } });

        if (user && user.passwordHash) {
            // Generate 6-digit OTP
            const otp = crypto.randomInt(100000, 999999).toString();
            const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

            // Store in VerificationToken (upsert pattern)
            await prisma.verificationToken.deleteMany({
                where: { identifier: `reset:${email}` },
            });
            await prisma.verificationToken.create({
                data: {
                    identifier: `reset:${email}`,
                    token: otp,
                    expires: expiresAt,
                },
            });

            // Send email
            await sendOtpEmail(email, otp);
        }

        // Always return success (prevent enumeration)
        return NextResponse.json({
            success: true,
            message: "If an account with that email exists, a reset code has been sent.",
        });
    } catch (error) {
        console.error("Forgot password error:", error);
        return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
    }
}
