import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod/v4";

const changePasswordSchema = z.object({
    currentPassword: z.string().min(1, "Current password is required"),
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

        const session = await getServerSession();
        if (!session?.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const result = changePasswordSchema.safeParse(body);

        if (!result.success) {
            const firstError = result.error.issues[0]?.message || "Invalid input";
            return NextResponse.json({ error: firstError }, { status: 400 });
        }

        const { currentPassword, newPassword } = result.data;

        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
        });

        if (!user || !user.passwordHash) {
            return NextResponse.json(
                { error: "Password change is not available for this account." },
                { status: 400 }
            );
        }

        // Verify current password
        const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
        if (!isValid) {
            return NextResponse.json(
                { error: "Current password is incorrect." },
                { status: 400 }
            );
        }

        // Prevent reusing the same password
        const isSame = await bcrypt.compare(newPassword, user.passwordHash);
        if (isSame) {
            return NextResponse.json(
                { error: "New password must be different from current password." },
                { status: 400 }
            );
        }

        // Hash and save new password
        const newHash = await bcrypt.hash(newPassword, 12);
        await prisma.user.update({
            where: { id: user.id },
            data: { passwordHash: newHash },
        });

        return NextResponse.json({ success: true }, { status: 200 });
    } catch (error) {
        console.error("Change password error:", error);
        return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
    }
}
