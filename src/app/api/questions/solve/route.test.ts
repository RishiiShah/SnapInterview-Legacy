import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";
import { GET, POST } from "./route";

import { prisma } from "@/lib/prisma";
import { csrfRejectIfInvalid } from "@/lib/csrf";
import { getServerAuthSession } from "@/lib/server-auth";

vi.mock("@/lib/csrf", () => ({
  csrfRejectIfInvalid: vi.fn(() => null),
}));

vi.mock("@/lib/server-auth", () => ({
  getServerAuthSession: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    solvedQuestion: {
      findMany: vi.fn(),
      upsert: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

describe("GET /api/questions/solve", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when unauthenticated", async () => {
    vi.mocked(getServerAuthSession).mockResolvedValue(null as never);

    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns solved question IDs", async () => {
    vi.mocked(getServerAuthSession).mockResolvedValue({
      user: { email: "user@example.com" },
    } as never);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: "user-1" } as never);
    vi.mocked(prisma.solvedQuestion.findMany).mockResolvedValue([
      { questionId: 1 },
      { questionId: 5 },
      { questionId: 12 },
    ] as never);

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.solvedQuestionIds).toEqual([1, 5, 12]);
  });

  it("uses the authenticated user ID without a second user lookup", async () => {
    vi.mocked(getServerAuthSession).mockResolvedValue({
      user: { id: "user-1", email: "user@example.com" },
    } as never);
    vi.mocked(prisma.solvedQuestion.findMany).mockResolvedValue([] as never);

    const res = await GET();

    expect(res.status).toBe(200);
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });
});

describe("POST /api/questions/solve", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("short-circuits when CSRF validation fails", async () => {
    vi.mocked(csrfRejectIfInvalid).mockReturnValue(
      NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    );

    const req = new Request("http://localhost/api/questions/solve", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ questionId: 1, solved: true }),
    });

    const res = await POST(req);
    expect(res.status).toBe(403);
  });

  it("returns 401 when unauthenticated", async () => {
    vi.mocked(csrfRejectIfInvalid).mockReturnValue(null);
    vi.mocked(getServerAuthSession).mockResolvedValue(null as never);

    const req = new Request("http://localhost/api/questions/solve", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "http://localhost:3000",
      },
      body: JSON.stringify({ questionId: 1, solved: true }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("rejects invalid questionId", async () => {
    vi.mocked(csrfRejectIfInvalid).mockReturnValue(null);
    vi.mocked(getServerAuthSession).mockResolvedValue({
      user: { email: "user@example.com" },
    } as never);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: "user-1" } as never);

    const req = new Request("http://localhost/api/questions/solve", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "http://localhost:3000",
      },
      body: JSON.stringify({ questionId: -1, solved: true }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("marks a question as solved with one atomic upsert", async () => {
    vi.mocked(csrfRejectIfInvalid).mockReturnValue(null);
    vi.mocked(getServerAuthSession).mockResolvedValue({
      user: { email: "user@example.com" },
    } as never);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: "user-1" } as never);
    vi.mocked(prisma.solvedQuestion.upsert).mockResolvedValue({} as never);

    const req = new Request("http://localhost/api/questions/solve", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "http://localhost:3000",
      },
      body: JSON.stringify({ questionId: 5, solved: true }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ solved: true, questionId: 5 });
    expect(prisma.solvedQuestion.upsert).toHaveBeenCalledWith({
      where: { userId_questionId: { userId: "user-1", questionId: 5 } },
      update: {},
      create: { userId: "user-1", questionId: 5 },
    });
  });

  it("unmarks a solved question with an idempotent delete", async () => {
    vi.mocked(csrfRejectIfInvalid).mockReturnValue(null);
    vi.mocked(getServerAuthSession).mockResolvedValue({
      user: { email: "user@example.com" },
    } as never);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: "user-1" } as never);
    vi.mocked(prisma.solvedQuestion.deleteMany).mockResolvedValue({ count: 1 } as never);

    const req = new Request("http://localhost/api/questions/solve", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "http://localhost:3000",
      },
      body: JSON.stringify({ questionId: 5, solved: false }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ solved: false, questionId: 5 });
    expect(prisma.solvedQuestion.deleteMany).toHaveBeenCalledWith({
      where: { userId: "user-1", questionId: 5 },
    });
  });

  it("rejects a request that omits the intended solved state", async () => {
    vi.mocked(csrfRejectIfInvalid).mockReturnValue(null);
    vi.mocked(getServerAuthSession).mockResolvedValue({
      user: { id: "user-1" },
    } as never);

    const req = new Request("http://localhost/api/questions/solve", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "http://localhost:3000",
      },
      body: JSON.stringify({ questionId: 5 }),
    });

    const res = await POST(req);

    expect(res.status).toBe(400);
    expect(prisma.solvedQuestion.upsert).not.toHaveBeenCalled();
    expect(prisma.solvedQuestion.deleteMany).not.toHaveBeenCalled();
  });
});
