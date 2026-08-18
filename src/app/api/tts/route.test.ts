import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "./route";
import { getSessionUserIdentity } from "@/lib/server-auth";

const { isLimitedMock } = vi.hoisted(() => ({ isLimitedMock: vi.fn().mockResolvedValue(false) }));

vi.mock("@/lib/env", () => ({
  env: { ELEVENLABS_API_KEY: "test-key", ELEVENLABS_VOICE_BALANCED: "voice-balanced" },
}));
vi.mock("@/lib/server-auth", () => ({ getSessionUserIdentity: vi.fn() }));
vi.mock("@/lib/rate-limit", () => ({ createRateLimiter: vi.fn(() => ({ isLimited: isLimitedMock })) }));
vi.mock("@/lib/route-security", () => ({ withCsrfProtection: (handler: (request: Request) => unknown) => handler }));
vi.mock("@/utils/logger", () => ({ logger: { error: vi.fn() } }));

describe("POST /api/tts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isLimitedMock.mockResolvedValue(false);
    vi.mocked(getSessionUserIdentity).mockResolvedValue({ userId: "user-1", email: "user@example.com" });
  });

  it("keeps a protected ElevenLabs fallback endpoint available", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(new ArrayBuffer(4), {
      status: 200,
      headers: { "Content-Type": "audio/mpeg" },
    })));

    const response = await POST(new Request("http://localhost/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "Fallback audio" }),
    }));

    expect(response.status).toBe(200);
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("api.elevenlabs.io/v1/text-to-speech/voice-balanced"),
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("returns 400 when request body is malformed JSON", async () => {
    const response = await POST(new Request("http://localhost/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not-json",
    }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Invalid JSON body" });
  });
});
