import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST, DELETE } from "./route";
import { getSessionUserIdentity } from "@/lib/server-auth";
import { csrfRejectIfInvalid } from "@/lib/csrf";
import { generateShareToken, revokeShareToken, getShareToken } from "@/repositories/interview-repo";

vi.mock("@/lib/server-auth", () => ({
  getSessionUserIdentity: vi.fn(),
}));

vi.mock("@/lib/csrf", () => ({
  csrfRejectIfInvalid: vi.fn(() => null),
}));

vi.mock("@/repositories/interview-repo", () => ({
  generateShareToken: vi.fn(),
  revokeShareToken: vi.fn(),
  getShareToken: vi.fn(),
}));

vi.mock("@/utils/logger", () => ({
  logger: { error: vi.fn() },
}));

const VALID_ID = "f47ac10b-58cc-4372-a567-0e02b2c3d479";
// IDs are cuids, so any non-empty string is accepted; only an empty id is rejected.
const INVALID_ID = "";

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe("GET /api/interview/[id]/share", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when unauthenticated", async () => {
    vi.mocked(getSessionUserIdentity).mockResolvedValue(null);
    const res = await GET(new Request("http://localhost"), makeParams(VALID_ID));
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid interview id", async () => {
    vi.mocked(getSessionUserIdentity).mockResolvedValue({ userId: "u1", email: "a@b.com" });
    const res = await GET(new Request("http://localhost"), makeParams(INVALID_ID));
    expect(res.status).toBe(400);
  });

  it("returns existing share token", async () => {
    vi.mocked(getSessionUserIdentity).mockResolvedValue({ userId: "u1", email: "a@b.com" });
    vi.mocked(getShareToken).mockResolvedValue("tok-abc");
    const res = await GET(new Request("http://localhost"), makeParams(VALID_ID));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ shareToken: "tok-abc" });
  });

  it("returns null share token when none exists", async () => {
    vi.mocked(getSessionUserIdentity).mockResolvedValue({ userId: "u1", email: "a@b.com" });
    vi.mocked(getShareToken).mockResolvedValue(null);
    const res = await GET(new Request("http://localhost"), makeParams(VALID_ID));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ shareToken: null });
  });

  it("returns 500 when repo throws", async () => {
    vi.mocked(getSessionUserIdentity).mockResolvedValue({ userId: "u1", email: "a@b.com" });
    vi.mocked(getShareToken).mockRejectedValue(new Error("DB error"));
    const res = await GET(new Request("http://localhost"), makeParams(VALID_ID));
    expect(res.status).toBe(500);
  });
});

describe("POST /api/interview/[id]/share", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 403 when CSRF fails", async () => {
    vi.mocked(csrfRejectIfInvalid).mockReturnValue(
      new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 }) as never,
    );
    const res = await POST(new Request("http://localhost", { method: "POST" }), makeParams(VALID_ID));
    expect(res.status).toBe(403);
  });

  it("returns 401 when unauthenticated", async () => {
    vi.mocked(csrfRejectIfInvalid).mockReturnValue(null);
    vi.mocked(getSessionUserIdentity).mockResolvedValue(null);
    const res = await POST(new Request("http://localhost", { method: "POST" }), makeParams(VALID_ID));
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid interview id", async () => {
    vi.mocked(csrfRejectIfInvalid).mockReturnValue(null);
    vi.mocked(getSessionUserIdentity).mockResolvedValue({ userId: "u1", email: "a@b.com" });
    const res = await POST(new Request("http://localhost", { method: "POST" }), makeParams(INVALID_ID));
    expect(res.status).toBe(400);
  });

  it("returns 404 when interview not found or not evaluated", async () => {
    vi.mocked(csrfRejectIfInvalid).mockReturnValue(null);
    vi.mocked(getSessionUserIdentity).mockResolvedValue({ userId: "u1", email: "a@b.com" });
    vi.mocked(generateShareToken).mockResolvedValue(null);
    const res = await POST(new Request("http://localhost", { method: "POST" }), makeParams(VALID_ID));
    expect(res.status).toBe(404);
  });

  it("generates and returns a share token", async () => {
    vi.mocked(csrfRejectIfInvalid).mockReturnValue(null);
    vi.mocked(getSessionUserIdentity).mockResolvedValue({ userId: "u1", email: "a@b.com" });
    vi.mocked(generateShareToken).mockResolvedValue("tok-xyz");
    const res = await POST(new Request("http://localhost", { method: "POST" }), makeParams(VALID_ID));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ shareToken: "tok-xyz" });
  });

  it("returns 500 when repo throws", async () => {
    vi.mocked(csrfRejectIfInvalid).mockReturnValue(null);
    vi.mocked(getSessionUserIdentity).mockResolvedValue({ userId: "u1", email: "a@b.com" });
    vi.mocked(generateShareToken).mockRejectedValue(new Error("DB error"));
    const res = await POST(new Request("http://localhost", { method: "POST" }), makeParams(VALID_ID));
    expect(res.status).toBe(500);
  });
});

describe("DELETE /api/interview/[id]/share", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 403 when CSRF fails", async () => {
    vi.mocked(csrfRejectIfInvalid).mockReturnValue(
      new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 }) as never,
    );
    const res = await DELETE(new Request("http://localhost", { method: "DELETE" }), makeParams(VALID_ID));
    expect(res.status).toBe(403);
  });

  it("returns 401 when unauthenticated", async () => {
    vi.mocked(csrfRejectIfInvalid).mockReturnValue(null);
    vi.mocked(getSessionUserIdentity).mockResolvedValue(null);
    const res = await DELETE(new Request("http://localhost", { method: "DELETE" }), makeParams(VALID_ID));
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid interview id", async () => {
    vi.mocked(csrfRejectIfInvalid).mockReturnValue(null);
    vi.mocked(getSessionUserIdentity).mockResolvedValue({ userId: "u1", email: "a@b.com" });
    const res = await DELETE(new Request("http://localhost", { method: "DELETE" }), makeParams(INVALID_ID));
    expect(res.status).toBe(400);
  });

  it("revokes token and returns null shareToken", async () => {
    vi.mocked(csrfRejectIfInvalid).mockReturnValue(null);
    vi.mocked(getSessionUserIdentity).mockResolvedValue({ userId: "u1", email: "a@b.com" });
    vi.mocked(revokeShareToken).mockResolvedValue(true);
    const res = await DELETE(new Request("http://localhost", { method: "DELETE" }), makeParams(VALID_ID));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ shareToken: null });
    expect(revokeShareToken).toHaveBeenCalledWith({ interviewId: VALID_ID, userId: "u1" });
  });

  it("returns 500 when repo throws", async () => {
    vi.mocked(csrfRejectIfInvalid).mockReturnValue(null);
    vi.mocked(getSessionUserIdentity).mockResolvedValue({ userId: "u1", email: "a@b.com" });
    vi.mocked(revokeShareToken).mockRejectedValue(new Error("DB error"));
    const res = await DELETE(new Request("http://localhost", { method: "DELETE" }), makeParams(VALID_ID));
    expect(res.status).toBe(500);
  });
});
