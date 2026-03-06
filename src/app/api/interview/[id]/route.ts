import { prisma } from "@/lib/prisma";
import { z } from "zod/v4";
import { getSessionUserIdentity } from "@/lib/server-auth";
import { apiJson, badRequestError, internalServerError, notFoundError, unauthorizedError } from "@/lib/api-response";

const interviewIdSchema = z.string().uuid();

export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const authUser = await getSessionUserIdentity();
        if (!authUser) {
            return unauthorizedError();
        }

        const { id } = await params;
        const parsedId = interviewIdSchema.safeParse(id);
        if (!parsedId.success) {
            return badRequestError("Invalid interview ID");
        }

        const interviewSession = await prisma.interviewSession.findFirst({
            where: {
                id: parsedId.data,
                userId: authUser.userId,
            },
            select: {
                id: true,
                role: true,
                type: true,
                difficulty: true,
                evaluation: true,
                createdAt: true,
                transcript: {
                    select: {
                        id: true,
                        question: true,
                        answer: true,
                        order: true,
                        createdAt: true,
                    },
                    orderBy: {
                        order: 'asc'
                    }
                }
            }
        });

        if (!interviewSession) {
            return notFoundError("Interview session not found");
        }

        return apiJson(interviewSession);
    } catch (error) {
        console.error("Get interview session error:", error);
        return internalServerError();
    }
}
