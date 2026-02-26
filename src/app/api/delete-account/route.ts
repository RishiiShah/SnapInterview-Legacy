import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { prisma } from "@/lib/prisma";

export async function DELETE(req: Request) {
    try {
        // CSRF protection: validate Origin header
        const origin = req.headers.get("origin");
        const allowedOrigin = process.env.NEXTAUTH_URL || "http://localhost:3000";
        if (!origin || origin !== allowedOrigin) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const session = await getServerSession();
        if (!session?.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        if (body.confirm !== "DELETE") {
            return NextResponse.json(
                { error: "Please type DELETE to confirm." },
                { status: 400 }
            );
        }

        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
        });

        if (!user) {
            return NextResponse.json({ error: "User not found." }, { status: 404 });
        }

        // Delete user — cascading deletes handle Account and Session records
        await prisma.user.delete({
            where: { id: user.id },
        });

        return NextResponse.json({ success: true }, { status: 200 });
    } catch (error) {
        console.error("Delete account error:", error);
        return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
    }
}
