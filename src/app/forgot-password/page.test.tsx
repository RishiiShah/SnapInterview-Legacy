// @vitest-environment jsdom

import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ForgotPasswordPage from "./page";

const { routerPush } = vi.hoisted(() => ({ routerPush: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: routerPush }),
}));

vi.mock("next/image", () => ({
  default: ({ alt }: { alt: string }) => <span aria-label={alt || undefined} />,
}));

vi.mock("framer-motion", () => {
  const motionPropNames = new Set([
    "animate",
    "exit",
    "initial",
    "transition",
    "variants",
    "whileHover",
    "whileTap",
  ]);
  const omitMotionProps = (props: Record<string, unknown>) =>
    Object.fromEntries(Object.entries(props).filter(([key]) => !motionPropNames.has(key)));

  return {
    AnimatePresence: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
    motion: new Proxy({}, {
      get: (_target, tag: string) => ({
        children,
        ...props
      }: Record<string, unknown> & { children?: React.ReactNode }) =>
        React.createElement(tag, omitMotionProps(props), children),
    }),
    useReducedMotion: () => false,
  };
});

function jsonResponse(body: Record<string, unknown> = {}) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

describe("ForgotPasswordPage", () => {
  beforeEach(() => {
    routerPush.mockReset();
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse({ ok: true })));
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("fills a pasted code without submitting until passwords are provided", async () => {
    render(<ForgotPasswordPage />);
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "user@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send reset code" }));
    await screen.findByText(/Enter the 6-digit code sent to/);

    fireEvent.paste(screen.getByLabelText("Digit 1"), {
      clipboardData: { getData: () => "12a34-56" },
    });

    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    expect((screen.getByRole("button", { name: "Reset password" }) as HTMLButtonElement).disabled)
      .toBe(true);
  });
});
