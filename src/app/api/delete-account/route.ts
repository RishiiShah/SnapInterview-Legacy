import { getServerSession } from "next-auth/next";
import { prisma } from "@/lib/prisma";
import { csrfRejectIfInvalid } from "@/lib/csrf";
import { apiJson, badRequestError, internalServerError, notFoundError, unauthorizedError } from "@/lib/api-response";

export async function DELETE(req: Request) {
    try {
        const csrfError = csrfRejectIfInvalid(req);
        if (csrfError) return csrfError;

        const session = await getServerSession();
        if (!session?.user?.email) {
            return unauthorizedError();
        }

        const body = await req.json();
        if (body.confirm !== "DELETE") {
            return badRequestError("Please type DELETE to confirm.");
        }

        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
        });

        if (!user) {
            return notFoundError("User not found.");
        }

        // Delete user — cascading deletes handle Account and Session records
        await prisma.user.delete({
            where: { id: user.id },
        });

        return apiJson({ success: true });
    } catch (error) {
        console.error("Delete account error:", error);
        return internalServerError();
    }
}
