import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";
import { POST } from "./route";
import { csrfRejectIfInvalid } from "@/lib/csrf";
import { getSessionUserIdentity } from "@/lib/server-auth";

vi.mock("@/lib/csrf", () => ({
  csrfRejectIfInvalid: vi.fn(() => null),
}));

vi.mock("@/lib/server-auth", () => ({
  getSessionUserIdentity: vi.fn(),
}));

vi.mock("@/lib/rate-limit", () => ({
  createRateLimiter: vi.fn(() => ({
    isLimited: vi.fn().mockResolvedValue(false),
  })),
}));

const originalApiKey = process.env.ELEVENLABS_API_KEY;

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
    process.env.ELEVENLABS_API_KEY = "test-elevenlabs-key";
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
    if (originalApiKey === undefined) {
      delete process.env.ELEVENLABS_API_KEY;
    } else {
      process.env.ELEVENLABS_API_KEY = originalApiKey;
    }
    vi.unstubAllGlobals();
  });

  it("returns 503 when ElevenLabs is not configured", async () => {
    delete process.env.ELEVENLABS_API_KEY;

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
      expect.stringContaining("nPczCjzI2devNBz1zQrb"),
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("returns 502 without leaking upstream error details", async () => {
    vi.mocked(getSessionUserIdentity).mockResolvedValue({ userId: "user-1", email: "u@example.com" });
    vi.mocked(fetch).mockResolvedValueOnce(new Response("secret upstream body", { status: 500 }));

    const response = await POST(makeRequest({ text: "Hello" }));

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({ error: "Text-to-speech generation failed" });
  });
});
