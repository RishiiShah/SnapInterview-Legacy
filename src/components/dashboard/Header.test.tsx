// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
  useRouter: () => ({ replace: vi.fn() }),
}));

vi.mock("@/lib/auth-client", () => ({
  useSession: () => ({ data: { user: { name: "Stale client user", email: "stale@example.com" } } }),
  signOut: vi.fn(),
}));

vi.mock("./Sidebar", () => ({ navItems: [] }));

vi.mock("@/components/ui/animated-icons", () => ({
  AnimatedBellIcon: () => <svg />,
  AnimatedSearchIcon: () => <svg />,
}));

import { Header } from "./Header";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });

  return { promise, resolve };
}

describe("Header notifications", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("coalesces repeated opens while the notification request is pending", () => {
    const response = deferred<Response>();
    const fetchMock = vi.fn().mockReturnValue(response.promise);
    vi.stubGlobal("fetch", fetchMock);

    render(<Header onSearchOpen={vi.fn()} user={{ name: "Candidate", email: "candidate@example.com", image: null }} />);

    const notificationButton = screen.getByRole("button", { name: "Notifications" });
    fireEvent.click(notificationButton);
    fireEvent.click(notificationButton);

    expect(fetchMock).toHaveBeenCalledOnce();

    response.resolve(new Response(JSON.stringify({ notifications: [] }), { status: 200 }));
  });

  it("uses the server-hydrated identity in the profile menu", () => {
    render(<Header onSearchOpen={vi.fn()} user={{ name: "Candidate", email: "candidate@example.com", image: null }} />);

    fireEvent.click(screen.getByRole("button", { name: "User profile menu" }));

    expect(screen.getAllByText("Candidate")).toHaveLength(2);
    expect(screen.getByText("candidate@example.com")).toBeTruthy();
    expect(screen.queryByText("Stale client user")).toBeNull();
  });
});
