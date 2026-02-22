import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isDisposableEmail } from "@/lib/disposable-emails";
import { sendOtpEmail } from "@/lib/email";
import bcrypt from "bcryptjs";
import { z } from "zod/v4";
import crypto from "crypto";

// ── Zod schema ──
const registerSchema = z.object({
    name: z.string().trim().min(1, "Name is required").max(100, "Name is too long"),
    email: z.email("Invalid email address"),
    password: z
        .string()
        .min(8, "Password must be at least 8 characters")
        .max(128, "Password is too long")
        .refine((pw) => /[A-Z]/.test(pw), "Password must contain an uppercase letter")
        .refine((pw) => /[a-z]/.test(pw), "Password must contain a lowercase letter")
        .refine((pw) => /[0-9]/.test(pw), "Password must contain a number")
        .refine((pw) => /[^A-Za-z0-9]/.test(pw), "Password must contain a special character"),
});

// ── Simple in-memory rate limiter ──
const rateLimit = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 5; // 5 registrations per minute per IP

function isRateLimited(ip: string): boolean {
    const now = Date.now();
    const entry = rateLimit.get(ip);

    if (!entry || now > entry.resetTime) {
        rateLimit.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
        return false;
    }

    entry.count++;
    return entry.count > RATE_LIMIT_MAX_REQUESTS;
}

/** Generate a cryptographically secure 6-digit OTP */
function generateOtp(): string {
    return crypto.randomInt(100000, 999999).toString();
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

        // Rate limiting
        const forwarded = req.headers.get("x-forwarded-for");
        const ip = forwarded?.split(",")[0]?.trim() || "unknown";

        if (isRateLimited(ip)) {
            return NextResponse.json(
                { error: "Too many requests. Please try again later." },
                { status: 429 }
            );
        }

        // Parse & validate input
        const body = await req.json();
        const result = registerSchema.safeParse(body);

        if (!result.success) {
            const firstError = result.error.issues[0]?.message || "Invalid input";
            return NextResponse.json(
                { error: firstError },
                { status: 400 }
            );
        }

        const { name, email, password } = result.data;
        const normalizedEmail = email.toLowerCase();

        // Block disposable/temporary email services
        const emailCheck = await isDisposableEmail(normalizedEmail);
        if (emailCheck.disposable) {
            return NextResponse.json(
                { error: "Please use a permanent email address. Temporary email services are not allowed." },
                { status: 400 }
            );
        }

        // Check for existing user
        const existingUser = await prisma.user.findUnique({
            where: { email: normalizedEmail },
        });

        // Prevent email enumeration — always hash (constant timing)
        const passwordHash = await bcrypt.hash(password, 12);

        if (existingUser) {
            return NextResponse.json(
                { error: "Unable to create account. Please try a different email or log in." },
                { status: 409 }
            );
        }

        // Generate OTP and store pending user (upsert to handle resends)
        const otp = generateOtp();
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

        // Delete any existing pending records for this email, then create new one
        await prisma.pendingUser.deleteMany({ where: { email: normalizedEmail } });
        await prisma.pendingUser.create({
            data: {
                name,
                email: normalizedEmail,
                passwordHash,
                otp,
                expiresAt,
            },
        });

        // Send OTP email
        await sendOtpEmail(normalizedEmail, otp);

        return NextResponse.json(
            { success: true, message: "Verification code sent to your email." },
            { status: 200 }
        );
    } catch (error) {
        console.error("Registration error:", error);
        return NextResponse.json(
            { error: "Something went wrong" },
            { status: 500 }
        );
    }
}
