import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";
import { hardDeleteSoftDeletedSessions } from "@/repositories/interview-repo";

vi.mock("@/lib/env", () => ({
  env: { CRON_SECRET: "test-secret" },
}));

vi.mock("@/repositories/interview-repo", () => ({
  hardDeleteSoftDeletedSessions: vi.fn(),
}));

vi.mock("@/utils/logger", () => ({
  logger: { info: vi.fn(), error: vi.fn() },
}));

function makeRequest(authHeader?: string) {
  return new Request("http://localhost/api/cron/cleanup", {
    headers: authHeader ? { authorization: authHeader } : {},
  });
}

describe("GET /api/cron/cleanup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when no authorization header", async () => {
    const res = await GET(makeRequest() as never);
    expect(res.status).toBe(401);
  });

  it("returns 401 when bearer token is wrong", async () => {
    const res = await GET(makeRequest("Bearer wrong-secret") as never);
    expect(res.status).toBe(401);
  });

  it("returns 200 with deleted count on success", async () => {
    vi.mocked(hardDeleteSoftDeletedSessions).mockResolvedValue(5);

    const res = await GET(makeRequest("Bearer test-secret") as never);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ deleted: 5 });
    expect(hardDeleteSoftDeletedSessions).toHaveBeenCalledOnce();
    const callArg = vi.mocked(hardDeleteSoftDeletedSessions).mock.calls[0][0];
    expect(callArg).toBeInstanceOf(Date);
  });

  it("passes a cutoff date approximately 30 days ago", async () => {
    vi.mocked(hardDeleteSoftDeletedSessions).mockResolvedValue(0);
    const before = Date.now();

    await GET(makeRequest("Bearer test-secret") as never);

    const cutoff = vi.mocked(hardDeleteSoftDeletedSessions).mock.calls[0][0] as Date;
    const expectedMs = 30 * 24 * 60 * 60 * 1000;
    expect(before - cutoff.getTime()).toBeGreaterThanOrEqual(expectedMs - 1000);
    expect(before - cutoff.getTime()).toBeLessThanOrEqual(expectedMs + 1000);
  });

  it("returns 500 when repository throws", async () => {
    vi.mocked(hardDeleteSoftDeletedSessions).mockRejectedValue(new Error("DB error"));

    const res = await GET(makeRequest("Bearer test-secret") as never);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toHaveProperty("error");
  });
});
