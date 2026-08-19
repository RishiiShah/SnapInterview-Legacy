import {
  apiJson,
  apiError,
  badRequestError,
  internalServerError,
  notFoundError,
  unauthorizedError,
} from "@/lib/api-response";
import { getSessionUserIdentity } from "@/lib/server-auth";
import { runInterviewChat } from "@/services/interview-service";
import { createRateLimiter } from "@/lib/rate-limit";
import { withCsrfProtection } from "@/lib/route-security";
import { interviewIdSchema } from "@/lib/interview/domain";
import { parseJsonBody } from "@/lib/http/request-body";
import { MAX_IMAGE_BASE64_LENGTH } from "@/lib/interview/chat-messages";
import { z } from "zod/v4";
import { logger } from "@/utils/logger";
import { MAX_MESSAGE_LENGTH, MAX_MESSAGES } from "@/lib/interview/chat-messages";

const chatSchema = z.object({
  interviewId: interviewIdSchema,
  expectedCurrentQuestion: z.number().int().min(0),
  messages: z.array(
    z.object({
      role: z.string().min(1),
      content: z.string(),
      board: z
        .object({
          scene: z.object({
            version: z.literal(1),
            revision: z.number(),
            contentHash: z.string(),
            nodes: z.array(
              z.object({
                id: z.string(),
                kind: z.string(),
                label: z.string(),
                x: z.number().optional(),
                y: z.number().optional(),
              })
            ),
            edges: z.array(
              z.object({
                id: z.string(),
                from: z.string(),
                to: z.string(),
                label: z.string().optional(),
              })
            ),
          }),
          imageBase64: z.string().max(MAX_IMAGE_BASE64_LENGTH).optional(),
          mimeType: z.enum(["image/jpeg", "image/png"]),
          visionStatus: z.enum(["vision_available", "vision_unavailable"]).optional(),
        })
        .optional(),
    })
  ).max(MAX_MESSAGES),
});

const interviewChatLimiter = createRateLimiter("interview-chat", 60 * 1000, 30);

export const POST = withCsrfProtection(async (req: Request) => {
  try {
    const authUser = await getSessionUserIdentity();
    if (!authUser) {
      return unauthorizedError();
    }

    if (await interviewChatLimiter.isLimited(authUser.userId)) {
      return new Response("Too many chat requests. Please try again later.", { status: 429 });
    }

    const parsed = await parseJsonBody(req, chatSchema);
    if (!parsed.ok) {
      return parsed.response;
    }

    const { interviewId, messages: rawMessages, expectedCurrentQuestion } = parsed.data;

    const result = await runInterviewChat({
      userId: authUser.userId,
      interviewId,
      rawMessages,
      expectedCurrentQuestion,
      abortSignal: req.signal,
    });

    if (result.type === "not_found") {
      return notFoundError("Interview session not found");
    }

    if (result.type === "expired") {
      return apiError("This interview expired after 24 hours.", 410);
    }

    if (result.type === "error") {
      return badRequestError(result.message);
    }

    if (result.type === "conflict") {
      return apiJson({ error: result.message, currentQuestion: result.currentQuestion }, 409);
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
    logger.error("Chat API route error", {
      error: error instanceof Error ? error.message : String(error),
      route: "POST /api/interview/chat",
    });
    return internalServerError();
  }
});
