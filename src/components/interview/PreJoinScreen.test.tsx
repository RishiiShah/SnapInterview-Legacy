// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import PreJoinScreen, { type PreJoinScreenProps } from "./PreJoinScreen";

vi.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: { div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div> },
}));

vi.mock("@/components/interview/PermissionRequest", () => ({
  default: () => <div data-testid="permission-request" />,
}));

function createProps(ttsStatus: "idle" | "loading" | "ready" | "fallback" | "error"): PreJoinScreenProps {
  return {
    onBack: vi.fn(),
    onPermissionsGranted: vi.fn(),
    hasPermission: true,
    isLoading: false,
    error: null,
    requestPermissions: vi.fn().mockResolvedValue(undefined),
    videoRef: { current: null },
    joinBlockedReason: null,
    ttsStatus,
  };
}

describe("PreJoinScreen", () => {
  it("shows local voice preparation without blocking the join screen", () => {
    render(<PreJoinScreen {...createProps("loading")} />);

    expect(screen.getByText("Preparing interview voice…")).toBeTruthy();
    expect(screen.getByTestId("permission-request")).toBeTruthy();
  });

  it("shows a non-blocking fallback message when local voice is unavailable", () => {
    render(<PreJoinScreen {...createProps("fallback")} />);

    expect(screen.getByText("Using backup interview voice")).toBeTruthy();
  });
});
