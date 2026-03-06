import { validateRequestOrigin } from "@/lib/csrf";
import { getSessionUserIdentity } from "@/lib/server-auth";
import { runInterviewChat } from "@/services/interview-service";

export async function POST(req: Request) {
    try {
        // 0. CSRF protection
        const { isValid } = validateRequestOrigin(req);
        if (!isValid) {
            return new Response(JSON.stringify({ error: 'Forbidden' }), {
                status: 403,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // 1. Authenticate the user
        const authUser = await getSessionUserIdentity();
        if (!authUser) {
            return new Response(JSON.stringify({ error: "Unauthorized" }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const body = await req.json();
        const { messages: rawMessages, interviewId } = body;

        if (!interviewId || typeof interviewId !== 'string') {
            return new Response(JSON.stringify({ error: "interviewId is required" }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const result = await runInterviewChat({
            userId: authUser.userId,
            interviewId,
            rawMessages,
        });

        if (result.type === "not_found") {
            return new Response(JSON.stringify({ error: "Interview session not found" }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        if (result.type === "done") {
            return new Response(JSON.stringify(result.data), {
                headers: { 'Content-Type': 'application/json' },
            });
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
        const message = error instanceof Error ? error.message : "Failed to generate response";
        return new Response(JSON.stringify({ error: message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}
