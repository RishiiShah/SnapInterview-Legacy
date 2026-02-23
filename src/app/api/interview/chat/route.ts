import { Groq } from 'groq-sdk';
import { getServerSession } from "next-auth/next";
import { prisma } from "@/lib/prisma";
import { readFileSync, existsSync } from 'fs';
import path from 'path';

// Initialize Groq (requires GROQ_API_KEY in .env)
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: Request) {
    try {
        // 0. Authenticate the user
        const session = await getServerSession();
        if (!session?.user?.email) {
            return new Response(JSON.stringify({ error: "Unauthorized" }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const body = await req.json();
        const { messages, interviewId } = body;

        if (!interviewId) {
            return new Response(JSON.stringify({ error: "interviewId is required" }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

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

        const { role, company, difficulty, jobDescription } = interviewSession;

        // 2. Load system instructions from .md files
        const promptsDir = path.join(process.cwd(), 'src/data/prompts');
        const corePromptPath = path.join(promptsDir, 'core.md');

        // Normalize role name to file name (e.g. "Frontend Developer" -> "frontend-developer")
        const normalizedRoleName = role.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
        const specificRolePath = path.join(promptsDir, 'roles', `${normalizedRoleName}.md`);
        const defaultRolePath = path.join(promptsDir, 'roles', 'default.md');

        let systemInstruction = "";

        // Read core rules
        if (existsSync(corePromptPath)) {
            systemInstruction += readFileSync(corePromptPath, 'utf-8') + "\n\n";
        }

        // Read role-specific rules, fallback to default
        if (existsSync(specificRolePath)) {
            systemInstruction += readFileSync(specificRolePath, 'utf-8') + "\n\n";
        } else if (existsSync(defaultRolePath)) {
            let defaultText = readFileSync(defaultRolePath, 'utf-8');
            defaultText = defaultText.replace(/{{ROLE}}/g, role);
            systemInstruction += defaultText + "\n\n";
        }

        // Add dynamic context from DB fields
        if (company) {
            systemInstruction += `\nThe candidate is interviewing for a position at **${company}**. You may subtly tailor questions to their domain.\n`;
        }

        systemInstruction += `\nInterview difficulty: **${difficulty}**. Adjust question complexity accordingly.\n`;

        if (jobDescription) {
            systemInstruction += `\nThe job description provided by the candidate:\n---\n${jobDescription}\n---\nUse this to tailor your questions to the specific role requirements.\n`;
        }

        // 3. Format messages for Groq
        const formattedMessages = [
            { role: "system", content: systemInstruction },
            ...(messages || [])
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

    } catch (error: any) {
        console.error("Groq API Error:", error);
        return new Response(JSON.stringify({ error: error.message || "Failed to generate response" }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}
