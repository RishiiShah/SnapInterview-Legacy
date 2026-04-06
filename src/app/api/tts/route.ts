import { NextRequest, NextResponse } from "next/server";

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;

// Voice IDs per persona — all overridable via env vars
const PERSONA_VOICES: Record<string, string> = {
  friendly: process.env.ELEVENLABS_VOICE_FRIENDLY ?? "cgSgspJ2msm6clMCkdW9", // Jessica - Playful, Bright, Warm
  balanced: process.env.ELEVENLABS_VOICE_BALANCED ?? "EXAVITQu4vr4xnSDxMaL", // Sarah - Mature, Reassuring
  strict:   process.env.ELEVENLABS_VOICE_STRICT   ?? "nPczCjzI2devNBz1zQrb", // Brian - Deep, Resonant
};

function resolveVoiceId(persona?: string | null): string {
  if (!persona) return PERSONA_VOICES.balanced;
  const key = persona.toLowerCase();
  return PERSONA_VOICES[key] ?? PERSONA_VOICES.balanced;
}

export async function POST(request: NextRequest) {
  if (!ELEVENLABS_API_KEY) {
    return NextResponse.json({ error: "ELEVENLABS_API_KEY is not set" }, { status: 503 });
  }

  let body: { text?: string; persona?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const text = body.text?.trim();
  if (!text) {
    return NextResponse.json({ error: "text is required" }, { status: 400 });
  }

  const voiceId = resolveVoiceId(body.persona);
  console.log(`[TTS] persona="${body.persona ?? "null"}" → voice=${voiceId}`);

  try {
    const upstream = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": ELEVENLABS_API_KEY,
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_flash_v2_5",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
          },
        }),
      }
    );

    if (!upstream.ok) {
      const detail = await upstream.text();
      console.error(`[TTS] ElevenLabs ${upstream.status}:`, detail);
      return NextResponse.json(
        { error: "ElevenLabs API error", status: upstream.status, detail },
        { status: 502 }
      );
    }

    const audio = await upstream.arrayBuffer();
    return new Response(audio, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[TTS] fetch failed:", err);
    return NextResponse.json({ error: "Failed to reach ElevenLabs" }, { status: 503 });
  }
}
