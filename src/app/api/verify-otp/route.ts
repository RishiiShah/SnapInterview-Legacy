import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod/v4";

const verifySchema = z.object({
    email: z.email("Invalid email address"),
    otp: z.string().length(6, "OTP must be 6 digits"),
});

export async function POST(req: Request) {
    try {
        // CSRF protection
        const origin = req.headers.get("origin");
        const allowedOrigin = process.env.NEXTAUTH_URL || "http://localhost:3000";
        if (!origin || !allowedOrigin.startsWith(origin)) {
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

        // Validate OTP
        if (pendingUser.otp !== otp) {
            return NextResponse.json(
                { error: "Invalid OTP. Please try again." },
                { status: 400 }
            );
        }

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
