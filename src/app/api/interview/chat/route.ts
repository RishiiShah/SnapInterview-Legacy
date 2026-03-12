import { csrfRejectIfInvalid } from "@/lib/csrf";
import { apiJson, badRequestError, internalServerError, notFoundError, unauthorizedError } from "@/lib/api-response";
import { getSessionUserIdentity } from "@/lib/server-auth";
import { runInterviewChat } from "@/services/interview-service";

export async function POST(req: Request) {
    try {
        const csrfError = csrfRejectIfInvalid(req);
        if (csrfError) return csrfError;

        const authUser = await getSessionUserIdentity();
        if (!authUser) {
            return unauthorizedError();
        }

        const body = await req.json();
        const { messages: rawMessages, interviewId } = body;

        if (!interviewId || typeof interviewId !== 'string') {
            return badRequestError("interviewId is required");
        }

        const result = await runInterviewChat({
            userId: authUser.userId,
            interviewId,
            rawMessages,
        });

        if (result.type === "not_found") {
            return notFoundError("Interview session not found");
        }

        if (result.type === "done") {
            return apiJson(result.data);
        }

        return new Response(result.data, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
            },
        });

    } catch (error) {
        console.error("Groq API Error:", error);
        return internalServerError();
    }
}
