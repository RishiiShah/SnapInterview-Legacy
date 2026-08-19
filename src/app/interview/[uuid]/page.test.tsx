import React from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  getServerAuthSession: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock("@/lib/server-auth", () => ({
  getServerAuthSession: mocks.getServerAuthSession,
}));

vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
}));

vi.mock("./InterviewPageClient", () => ({
  default: function InterviewPageClient() {
    return null;
  },
}));

import InterviewPage from "./page";

const pageProps = {
  params: Promise.resolve({ uuid: "interview-1" }),
};

describe("InterviewPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects unauthenticated users to login from the server guard", async () => {
    const redirectError = new Error("redirect");
    mocks.getServerAuthSession.mockResolvedValue(null);
    mocks.redirect.mockImplementation(() => {
      throw redirectError;
    });

    await expect(InterviewPage(pageProps)).rejects.toBe(redirectError);

    expect(mocks.getServerAuthSession).toHaveBeenCalledOnce();
    expect(mocks.redirect).toHaveBeenCalledWith("/login");
  });

  it("renders the interview client after the server auth guard", async () => {
    mocks.getServerAuthSession.mockResolvedValue({
      session: { userId: "user-1" },
    });
    const result = await InterviewPage(pageProps);

    expect(mocks.getServerAuthSession).toHaveBeenCalledOnce();
    expect(mocks.redirect).not.toHaveBeenCalled();
    expect(React.isValidElement(result)).toBe(true);
  });
});
