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

function createProps(
  ttsStatus: "idle" | "loading" | "ready" | "fallback" | "error",
  sttStatus?: "idle" | "loading" | "ready" | "error",
): PreJoinScreenProps {
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
    sttStatus,
  };
}

describe("PreJoinScreen", () => {
  it("shows local voice preparation without blocking the join screen", () => {
    render(<PreJoinScreen {...createProps("loading")} />);

    expect(screen.getByText("Preparing interview voice…")).toBeTruthy();
    expect(screen.getByTestId("permission-request")).toBeTruthy();
  });

  it("shows a recovery message when the Kokoro voice is unavailable", () => {
    render(<PreJoinScreen {...createProps("fallback")} />);

    expect(screen.getByText("Interview voice could not be prepared. Reload and try again.")).toBeTruthy();
  });

  it("shows speech-recognition download progress while the local model loads", () => {
    render(<PreJoinScreen {...createProps("ready", "loading")} />);

    expect(screen.getByText("Preparing speech recognition…")).toBeTruthy();
  });

  it("shows a non-blocking message when speech recognition is unavailable", () => {
    render(<PreJoinScreen {...createProps("ready", "error")} />);

    expect(screen.getByText(/type your answers/i)).toBeTruthy();
  });
});
