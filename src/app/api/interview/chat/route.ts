import { csrfRejectIfInvalid } from "@/lib/csrf";
import {
  apiJson,
  badRequestError,
  internalServerError,
  notFoundError,
  unauthorizedError,
} from "@/lib/api-response";
import { getSessionUserIdentity } from "@/lib/server-auth";
import { runInterviewChat } from "@/services/interview-service";
import { createRateLimiter } from "@/lib/rate-limit";
import { z } from "zod/v4";

const chatSchema = z.object({
  interviewId: z.string().uuid("interviewId must be a valid UUID"),
  messages: z.array(
    z.object({
      role: z.string().min(1),
      content: z.string(),
    })
  ),
});

const interviewChatLimiter = createRateLimiter("interview-chat", 60 * 1000, 30);

export async function POST(req: Request) {
  try {
    const csrfError = csrfRejectIfInvalid(req);
    if (csrfError) return csrfError;

    const authUser = await getSessionUserIdentity();
    if (!authUser) {
      return unauthorizedError();
    }

    if (await interviewChatLimiter.isLimited(authUser.userId)) {
      return new Response("Too many chat requests. Please try again later.", { status: 429 });
    }

    const body = await req.json();
    const parsed = chatSchema.safeParse(body);

    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message || "Invalid input";
      return badRequestError(firstError);
    }

    const { interviewId, messages: rawMessages } = parsed.data;

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
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Groq API Error:", error);
    return internalServerError();
  }
}
