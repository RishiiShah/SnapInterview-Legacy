import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  signOut: vi.fn(),
  headers: vi.fn(),
  userFindUnique: vi.fn(),
  sessionFindFirst: vi.fn(),
  getE2ETestIdentity: vi.fn(),
  revokeUserSessions: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      getSession: mocks.getSession,
      signOut: mocks.signOut,
    },
  },
}));

vi.mock("next/headers", () => ({
  headers: mocks.headers,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: mocks.userFindUnique,
    },
    session: {
      findFirst: mocks.sessionFindFirst,
    },
  },
}));

vi.mock("@/lib/test-auth", () => ({
  getE2ETestIdentity: mocks.getE2ETestIdentity,
}));

vi.mock("@/lib/account-security", () => ({
  revokeUserSessions: mocks.revokeUserSessions,
}));

import { getServerAuthSession, getSessionUserIdentity } from "./server-auth";

describe("server auth helpers", () => {
  beforeEach(() => {
    mocks.getSession.mockReset();
    mocks.signOut.mockReset();
    mocks.headers.mockReset();
    mocks.userFindUnique.mockReset();
    mocks.sessionFindFirst.mockReset();
    mocks.getE2ETestIdentity.mockReset();
    mocks.revokeUserSessions.mockReset();
    mocks.revokeUserSessions.mockResolvedValue(0);
    mocks.signOut.mockResolvedValue(undefined);
    mocks.sessionFindFirst.mockResolvedValue({ id: "session-1" });
  });

  it("delegates to Better Auth with request headers when test auth is unavailable", async () => {
    const requestHeaders = new Headers({ cookie: "session=abc" });
    const session = {
      user: { id: "user-1", email: "USER@EXAMPLE.COM" },
      session: { id: "session-1", userId: "user-1", token: "token-1" },
    };
    mocks.getE2ETestIdentity.mockResolvedValue(null);
    mocks.headers.mockResolvedValue(requestHeaders);
    mocks.getSession.mockResolvedValue(session);
    mocks.userFindUnique.mockResolvedValue({ lockedUntil: null });

    await expect(getServerAuthSession()).resolves.toBe(session);

    expect(mocks.headers).toHaveBeenCalledTimes(1);
    expect(mocks.getSession).toHaveBeenCalledWith({ headers: requestHeaders });
    // Session is served from Better Auth's cookie cache — no per-request DB lookups.
    expect(mocks.sessionFindFirst).not.toHaveBeenCalled();
    expect(mocks.userFindUnique).not.toHaveBeenCalled();
    expect(mocks.signOut).not.toHaveBeenCalled();
  });

  it("builds an E2E session from the database user when test identity is present", async () => {
    const createdAt = new Date("2026-01-01T00:00:00.000Z");
    const updatedAt = new Date("2026-01-02T00:00:00.000Z");
    mocks.getE2ETestIdentity.mockResolvedValue({
      userId: "test-user",
      email: "fallback@example.com",
      onboardingCompletedAt: "2026-01-03T00:00:00.000Z",
    });
    mocks.userFindUnique.mockResolvedValue({
      id: "test-user",
      name: "Stored User",
      email: " Stored@Example.COM ",
      image: "avatar.png",
      createdAt,
      updatedAt,
      emailVerified: false,
      isFirstLogin: true,
      notificationPrefs: { practiceReminder: true },
      onboardingCompletedAt: null,
      onboardingRole: "Frontend Developer",
      onboardingLevel: "senior",
      onboardingCompany: "OpenAI",
      onboardingGoal: "switch-companies",
      preferredInterviewType: "technical",
    });

    const session = await getServerAuthSession();

    expect(mocks.userFindUnique).toHaveBeenCalledWith({
      where: { id: "test-user" },
      select: expect.objectContaining({
        id: true,
        email: true,
        preferredInterviewType: true,
      }),
    });
    expect(session?.user).toMatchObject({
      id: "test-user",
      name: "Stored User",
      email: "stored@example.com",
      image: "avatar.png",
      createdAt,
      updatedAt,
      emailVerified: false,
      isFirstLogin: true,
      notificationPrefs: JSON.stringify({ practiceReminder: true }),
      onboardingRole: "Frontend Developer",
      onboardingLevel: "senior",
      onboardingCompany: "OpenAI",
      onboardingGoal: "switch-companies",
      preferredInterviewType: "technical",
    });
    expect(session?.session).toEqual({
      id: "e2e-session-test-user",
      token: null,
      userId: "test-user",
    });
    expect(mocks.getSession).not.toHaveBeenCalled();
  });

  it("falls back to E2E identity defaults when the database user is missing", async () => {
    mocks.getE2ETestIdentity.mockResolvedValue({
      userId: "missing-user",
      email: " E2E@Example.COM ",
      onboardingCompletedAt: "2026-01-03T00:00:00.000Z",
    });
    mocks.userFindUnique.mockResolvedValue(null);

    const session = await getServerAuthSession();

    expect(session?.user).toMatchObject({
      id: "missing-user",
      name: "E2E User",
      email: "e2e@example.com",
      image: null,
      emailVerified: true,
      isFirstLogin: false,
      notificationPrefs: "{}",
      onboardingCompletedAt: "2026-01-03T00:00:00.000Z",
    });
    expect(session?.session.userId).toBe("missing-user");
  });

  it("returns null identity when no authenticated user id exists", async () => {
    mocks.getE2ETestIdentity.mockResolvedValue(null);
    mocks.headers.mockResolvedValue(new Headers());
    mocks.getSession.mockResolvedValue({ user: { email: "user@example.com" }, session: null });

    await expect(getSessionUserIdentity()).resolves.toBeNull();
  });

  it("normalizes identity email and falls back to session userId", async () => {
    mocks.getE2ETestIdentity.mockResolvedValue(null);
    mocks.headers.mockResolvedValue(new Headers());
    mocks.getSession.mockResolvedValue({
      user: { email: " USER@Example.COM " },
      session: { id: "session-1", userId: "session-user", token: "token-1" },
    });
    mocks.userFindUnique.mockResolvedValue({ lockedUntil: null });

    await expect(getSessionUserIdentity()).resolves.toEqual({
      userId: "session-user",
      email: "user@example.com",
    });
  });
});
