import { Groq } from 'groq-sdk';
import { getServerSession } from "next-auth/next";
import { prisma } from "@/lib/prisma";
import { INTERVIEW_DONE_MESSAGE } from "@/lib/interview/constants";
import { sanitizeChatMessages } from "@/lib/interview/chat-messages";
import { buildSystemInstruction } from "@/lib/interview/prompts";
import { saveLatestTranscriptEntry } from "@/lib/interview/transcript-service";

// Initialize Groq (requires GROQ_API_KEY in .env)
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: Request) {
    try {
        // 0. CSRF protection
        const origin = req.headers.get('origin');
        const allowedOrigin = process.env.NEXTAUTH_URL || 'http://localhost:3000';
        if (!origin || origin !== allowedOrigin) {
            return new Response(JSON.stringify({ error: 'Forbidden' }), {
                status: 403,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // 1. Authenticate the user
        const session = await getServerSession();
        if (!session?.user?.email) {
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

        // 2. Sanitize client messages — strip injected system prompts, validate shape
        const messages = sanitizeChatMessages(rawMessages);

        // 1. Look up the interview session from the database
        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
        });

        if (!user) {
            return new Response(JSON.stringify({ error: "User not found" }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const interviewSession = await prisma.interviewSession.findFirst({
            where: {
                id: interviewId,
                userId: user.id,
            },
        });

        if (!interviewSession) {
            return new Response(JSON.stringify({ error: "Interview session not found" }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const { questionCount, currentQuestion } = interviewSession;

        await saveLatestTranscriptEntry({ interviewId, currentQuestion, messages });

        const systemInstruction = buildSystemInstruction(interviewSession);

        // 3. Server-side question limit check using persistent counter
        if (currentQuestion >= questionCount) {
            // Interview is done — signal the client without calling the LLM
            return new Response(JSON.stringify({ done: true, currentQuestion, doneMessage: INTERVIEW_DONE_MESSAGE }), {
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // 4. Format messages for Groq
        const formattedMessages = [
            { role: "system" as const, content: systemInstruction },
            ...messages.map((message) => ({
                role: message.role,
                content: message.content,
            })),
        ];

        // 4. Call Groq Completion
        const chatCompletion = await groq.chat.completions.create({
            messages: formattedMessages,
            model: "llama-3.3-70b-versatile",
            temperature: 0.7,
            max_completion_tokens: 1024,
            top_p: 1,
            stream: true,
        });

        // Increment the question counter now that the LLM call succeeded
        await prisma.interviewSession.update({
            where: { id: interviewId },
            data: { currentQuestion: { increment: 1 } },
        });

        // 5. Stream the response back
        const stream = new ReadableStream({
            async start(controller) {
                try {
                    for await (const chunk of chatCompletion) {
                        const content = chunk.choices[0]?.delta?.content || '';
                        if (content) {
                            controller.enqueue(new TextEncoder().encode(content));
                        }
                    }
                    controller.close();
                } catch (err) {
                    controller.error(err);
                }
            }
        });

        return new Response(stream, {
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
