import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";
import { getSessionUserIdentity } from "@/lib/server-auth";
import { prisma } from "@/lib/prisma";

const { rateLimited } = vi.hoisted(() => ({ rateLimited: { value: false } }));

vi.mock("@/lib/server-auth", () => ({ getSessionUserIdentity: vi.fn() }));
vi.mock("@/lib/csrf", () => ({ csrfRejectIfInvalid: vi.fn(() => null) }));
vi.mock("@/lib/rate-limit", () => ({
  createRateLimiter: vi.fn(() => ({ isLimited: vi.fn(() => rateLimited.value) })),
}));
vi.mock("@/lib/prisma", () => ({
  prisma: { companyRequest: { upsert: vi.fn() } },
}));

describe("POST /api/company-requests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    rateLimited.value = false;
  });

  it("stores one normalized pending request for an unlisted company", async () => {
    vi.mocked(getSessionUserIdentity).mockResolvedValue({ userId: "user-1", email: "user@example.com" });
    vi.mocked(prisma.companyRequest.upsert).mockResolvedValue({ id: "request-1", status: "PENDING" } as never);

    const response = await POST(new Request("http://localhost/api/company-requests", {
      method: "POST",
      headers: { "content-type": "application/json", origin: "http://localhost:3000" },
      body: JSON.stringify({ company: "  Acme   Robotics  " }),
    }));

    expect(response.status).toBe(201);
    expect(prisma.companyRequest.upsert).toHaveBeenCalledWith({
      where: { normalizedName: "acme robotics" },
      create: {
        requestedName: "Acme Robotics",
        normalizedName: "acme robotics",
        userId: "user-1",
      },
      update: {},
    });
  });

  it("rejects a company already in the curated list", async () => {
    vi.mocked(getSessionUserIdentity).mockResolvedValue({ userId: "user-1", email: "user@example.com" });

    const response = await POST(new Request("http://localhost/api/company-requests", {
      method: "POST",
      headers: { "content-type": "application/json", origin: "http://localhost:3000" },
      body: JSON.stringify({ company: "Google" }),
    }));

    expect(response.status).toBe(400);
    expect(prisma.companyRequest.upsert).not.toHaveBeenCalled();
  });

  it("rejects malformed JSON without creating a request", async () => {
    vi.mocked(getSessionUserIdentity).mockResolvedValue({ userId: "user-1", email: "user@example.com" });

    const response = await POST(new Request("http://localhost/api/company-requests", {
      method: "POST",
      headers: { "content-type": "application/json", origin: "http://localhost:3000" },
      body: "{",
    }));

    expect(response.status).toBe(400);
    expect(prisma.companyRequest.upsert).not.toHaveBeenCalled();
  });
});
