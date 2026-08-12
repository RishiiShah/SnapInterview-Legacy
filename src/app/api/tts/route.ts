import { apiError, badRequestError, internalServerError, unauthorizedError } from "@/lib/api-response";
import { env } from "@/lib/env";
import { createRateLimiter } from "@/lib/rate-limit";
import { withCsrfProtection } from "@/lib/route-security";
import { getSessionUserIdentity } from "@/lib/server-auth";
import { logger } from "@/utils/logger";
import { z } from "zod/v4";

const PERSONA_VOICES: Record<string, string> = {
  friendly: env.ELEVENLABS_VOICE_FRIENDLY ?? "cgSgspJ2msm6clMCkdW9",
  balanced: env.ELEVENLABS_VOICE_BALANCED ?? "EXAVITQu4vr4xnSDxMaL",
  strict: env.ELEVENLABS_VOICE_STRICT ?? "nPczCjzI2devNBz1zQrb",
};

const ttsSchema = z.object({
  text: z.string().trim().min(1).max(2000),
  persona: z.string().optional(),
});

const ttsLimiter = createRateLimiter("tts", 60 * 1000, 20);

function resolveVoiceId(persona?: string | null): string {
  if (!persona) return PERSONA_VOICES.balanced;
  return PERSONA_VOICES[persona.toLowerCase()] ?? PERSONA_VOICES.balanced;
}

/**
 * Dormant emergency fallback. Interview playback uses browser-local Kokoro and
 * never calls this endpoint unless a future explicit fallback policy enables it.
 */
export const POST = withCsrfProtection(async (req: Request) => {
  const elevenLabsApiKey = env.ELEVENLABS_API_KEY;
  if (!elevenLabsApiKey) return apiError("Text-to-speech is not configured", 503);

  const authUser = await getSessionUserIdentity();
  if (!authUser) return unauthorizedError();
  if (await ttsLimiter.isLimited(authUser.userId)) {
    return apiError("Too many text-to-speech requests. Please try again later.", 429);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return badRequestError("Invalid JSON body");
  }

  const parsed = ttsSchema.safeParse(body);
  if (!parsed.success) return badRequestError(parsed.error.issues[0]?.message || "Invalid input");

  try {
    const upstream = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${resolveVoiceId(parsed.data.persona)}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": elevenLabsApiKey,
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
        },
        body: JSON.stringify({
          text: parsed.data.text,
          model_id: "eleven_flash_v2_5",
          voice_settings: { stability: 0.5, similarity_boost: 0.75 },
        }),
      },
    );
    if (!upstream.ok) {
      logger.error("ElevenLabs TTS request failed", { status: upstream.status, userId: authUser.userId });
      return apiError("Text-to-speech generation failed", 502);
    }

    return new Response(await upstream.arrayBuffer(), {
      headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store" },
    });
  } catch (error) {
    logger.error("ElevenLabs TTS fetch failed", {
      error: error instanceof Error ? error.message : String(error),
      userId: authUser.userId,
    });
    return internalServerError("Text-to-speech is temporarily unavailable");
  }
});
