import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";
import { POST } from "./route";
import { csrfRejectIfInvalid } from "@/lib/csrf";
import { getSessionUserIdentity } from "@/lib/server-auth";
import { createRateLimiter } from "@/lib/rate-limit";

const { mockEnv, mockRateLimiterConfigs } = vi.hoisted(() => ({
  mockEnv: {
    ELEVENLABS_API_KEY: "test-elevenlabs-key",
    ELEVENLABS_VOICE_FRIENDLY: "custom-friendly-voice",
    ELEVENLABS_VOICE_BALANCED: "custom-balanced-voice",
    ELEVENLABS_VOICE_STRICT: "custom-strict-voice",
  },
  mockRateLimiterConfigs: [] as Array<[string, number, number]>,
}));

vi.mock("@/lib/csrf", () => ({
  csrfRejectIfInvalid: vi.fn(() => null),
}));

vi.mock("@/lib/server-auth", () => ({
  getSessionUserIdentity: vi.fn(),
}));

vi.mock("@/lib/rate-limit", () => ({
  createRateLimiter: vi.fn((namespace: string, windowMs: number, maxRequests: number) => {
    mockRateLimiterConfigs.push([namespace, windowMs, maxRequests]);
    return {
    isLimited: vi.fn().mockResolvedValue(false),
    };
  }),
}));

vi.mock("@/lib/env", () => ({
  env: mockEnv,
}));

function makeRequest(body: unknown, origin = "http://localhost:3000") {
  return new Request("http://localhost/api/tts", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      origin,
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/tts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEnv.ELEVENLABS_API_KEY = "test-elevenlabs-key";
    mockEnv.ELEVENLABS_VOICE_FRIENDLY = "custom-friendly-voice";
    mockEnv.ELEVENLABS_VOICE_BALANCED = "custom-balanced-voice";
    mockEnv.ELEVENLABS_VOICE_STRICT = "custom-strict-voice";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(new ArrayBuffer(8), {
          status: 200,
          headers: { "Content-Type": "audio/mpeg" },
        }),
      ),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns 503 when ElevenLabs is not configured", async () => {
    mockEnv.ELEVENLABS_API_KEY = undefined as never;

    const response = await POST(makeRequest({ text: "Hello" }));

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({ error: "Text-to-speech is not configured" });
  });

  it("returns 401 when user is unauthenticated", async () => {
    vi.mocked(getSessionUserIdentity).mockResolvedValue(null);

    const response = await POST(makeRequest({ text: "Hello" }));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
  });

  it("returns 403 when origin validation fails", async () => {
    vi.mocked(csrfRejectIfInvalid).mockReturnValueOnce(
      NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    );
    vi.mocked(getSessionUserIdentity).mockResolvedValue({ userId: "user-1", email: "u@example.com" });

    const response = await POST(makeRequest({ text: "Hello" }, "https://evil.example"));

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: "Forbidden" });
  });

  it("returns 400 when text is missing", async () => {
    vi.mocked(getSessionUserIdentity).mockResolvedValue({ userId: "user-1", email: "u@example.com" });

    const response = await POST(makeRequest({ persona: "friendly" }));

    expect(response.status).toBe(400);
  });

  it("returns audio when authenticated and upstream succeeds", async () => {
    vi.mocked(getSessionUserIdentity).mockResolvedValue({ userId: "user-1", email: "u@example.com" });

    const response = await POST(makeRequest({ text: "Hello there", persona: "strict" }));

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("audio/mpeg");
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("custom-strict-voice"),
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("uses a tighter per-user rate limit for paid TTS generation", () => {
    void createRateLimiter;
    expect(mockRateLimiterConfigs).toContainEqual(["tts", 60 * 1000, 20]);
  });

  it("returns 502 without leaking upstream error details", async () => {
    vi.mocked(getSessionUserIdentity).mockResolvedValue({ userId: "user-1", email: "u@example.com" });
    vi.mocked(fetch).mockResolvedValueOnce(new Response("secret upstream body", { status: 500 }));

    const response = await POST(makeRequest({ text: "Hello" }));

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({ error: "Text-to-speech generation failed" });
  });
});
