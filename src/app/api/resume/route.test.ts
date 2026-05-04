import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, DELETE } from "./route";
import { getSessionUserIdentity } from "@/lib/server-auth";
import { csrfRejectIfInvalid } from "@/lib/csrf";
import { getUserResume, deleteUserResume } from "@/repositories/user-repo";

vi.mock("@/lib/server-auth", () => ({
  getSessionUserIdentity: vi.fn(),
}));

vi.mock("@/lib/csrf", () => ({
  csrfRejectIfInvalid: vi.fn(() => null),
}));

vi.mock("@/repositories/user-repo", () => ({
  getUserResume: vi.fn(),
  deleteUserResume: vi.fn(),
}));

vi.mock("@/utils/logger", () => ({
  logger: { error: vi.fn() },
}));

describe("GET /api/resume", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when unauthenticated", async () => {
    vi.mocked(getSessionUserIdentity).mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns resume text when one is saved", async () => {
    vi.mocked(getSessionUserIdentity).mockResolvedValue({ userId: "u1", email: "a@b.com" });
    vi.mocked(getUserResume).mockResolvedValue("Experienced software engineer...");

    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ resumeText: "Experienced software engineer..." });
    expect(getUserResume).toHaveBeenCalledWith("u1");
  });

  it("returns null resumeText when no resume saved", async () => {
    vi.mocked(getSessionUserIdentity).mockResolvedValue({ userId: "u1", email: "a@b.com" });
    vi.mocked(getUserResume).mockResolvedValue(null);

    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ resumeText: null });
  });

  it("returns 500 when repo throws", async () => {
    vi.mocked(getSessionUserIdentity).mockResolvedValue({ userId: "u1", email: "a@b.com" });
    vi.mocked(getUserResume).mockRejectedValue(new Error("DB error"));

    const res = await GET();
    expect(res.status).toBe(500);
  });
});

describe("DELETE /api/resume", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 403 when CSRF fails", async () => {
    vi.mocked(csrfRejectIfInvalid).mockReturnValue(
      new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 }) as never,
    );
    const res = await DELETE(new Request("http://localhost", { method: "DELETE" }));
    expect(res.status).toBe(403);
  });

  it("returns 401 when unauthenticated", async () => {
    vi.mocked(csrfRejectIfInvalid).mockReturnValue(null);
    vi.mocked(getSessionUserIdentity).mockResolvedValue(null);
    const res = await DELETE(new Request("http://localhost", { method: "DELETE" }));
    expect(res.status).toBe(401);
  });

  it("deletes resume and returns success", async () => {
    vi.mocked(csrfRejectIfInvalid).mockReturnValue(null);
    vi.mocked(getSessionUserIdentity).mockResolvedValue({ userId: "u1", email: "a@b.com" });
    vi.mocked(deleteUserResume).mockResolvedValue(undefined);

    const res = await DELETE(new Request("http://localhost", { method: "DELETE" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
    expect(deleteUserResume).toHaveBeenCalledWith("u1");
  });

  it("returns 500 when repo throws", async () => {
    vi.mocked(csrfRejectIfInvalid).mockReturnValue(null);
    vi.mocked(getSessionUserIdentity).mockResolvedValue({ userId: "u1", email: "a@b.com" });
    vi.mocked(deleteUserResume).mockRejectedValue(new Error("DB error"));

    const res = await DELETE(new Request("http://localhost", { method: "DELETE" }));
    expect(res.status).toBe(500);
  });
});
