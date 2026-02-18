import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isDisposableEmail } from "@/lib/disposable-emails";
import bcrypt from "bcryptjs";
import { z } from "zod/v4";

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

export async function POST(req: Request) {
    try {
        // CSRF protection: validate Origin header
        const origin = req.headers.get("origin");
        const allowedOrigin = process.env.NEXTAUTH_URL || "http://localhost:3000";
        if (!origin || !allowedOrigin.startsWith(origin)) {
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

        // Block disposable/temporary email services
        const emailCheck = await isDisposableEmail(email);
        if (emailCheck.disposable) {
            return NextResponse.json(
                { error: "Please use a permanent email address. Temporary email services are not allowed." },
                { status: 400 }
            );
        }

        // Check for existing user
        const existingUser = await prisma.user.findUnique({
            where: { email: email.toLowerCase() },
        });

        // Prevent email enumeration — always hash (constant timing)
        const passwordHash = await bcrypt.hash(password, 12);

        if (existingUser) {
            return NextResponse.json(
                { error: "Unable to create account. Please try a different email or log in." },
                { status: 409 }
            );
        }

        const user = await prisma.user.create({
            data: {
                name,
                email: email.toLowerCase(),
                passwordHash,
                isFirstLogin: true,
            },
        });

        return NextResponse.json(
            { id: user.id, name: user.name, email: user.email },
            { status: 201 }
        );
    } catch (error) {
        console.error("Registration error:", error);
        return NextResponse.json(
            { error: "Something went wrong" },
            { status: 500 }
        );
    }
}
