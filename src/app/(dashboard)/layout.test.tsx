import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getServerAuthSessionMock, redirectMock } = vi.hoisted(() => ({
  getServerAuthSessionMock: vi.fn(),
  redirectMock: vi.fn(),
}));

vi.mock("@/lib/server-auth", () => ({
  getServerAuthSession: getServerAuthSessionMock,
}));

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

vi.mock("@/components/dashboard/DashboardShell", () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <section data-testid="dashboard-shell">{children}</section>
  ),
}));

import DashboardLayout from "./layout";

describe("DashboardLayout auth boundary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    redirectMock.mockImplementation((path: string) => {
      throw new Error(`redirect:${path}`);
    });
  });

  it("redirects unauthenticated users before rendering dashboard routes", async () => {
    getServerAuthSessionMock.mockResolvedValue(null);

    await expect(Promise.resolve().then(() => DashboardLayout({ children: <div>Private</div> }))).rejects.toThrow("redirect:/login");

    expect(getServerAuthSessionMock).toHaveBeenCalledOnce();
    expect(redirectMock).toHaveBeenCalledWith("/login");
  });

  it("renders dashboard routes for authenticated users", async () => {
    const session = {
      user: { name: "Candidate", email: "candidate@example.com", image: null },
      session: { userId: "user_123" },
    };
    getServerAuthSessionMock.mockResolvedValue(session);

    const element = await DashboardLayout({ children: <div>Private</div> });

    expect(getServerAuthSessionMock).toHaveBeenCalledOnce();
    expect(redirectMock).not.toHaveBeenCalled();
    expect((element as React.ReactElement<{ session: unknown }>).props.session).toBe(session);
    expect(element.props.children.props.children).toBe("Private");
  });
});
