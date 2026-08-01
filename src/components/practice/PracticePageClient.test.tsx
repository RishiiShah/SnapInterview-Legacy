// @vitest-environment jsdom

import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import PracticePageClient from "./PracticePageClient";

const routerPush = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: routerPush }),
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

  const omitMotionProps = (props: Record<string, unknown>) => {
    return Object.fromEntries(
      Object.entries(props).filter(([key]) => !motionPropNames.has(key)),
    );
  };

  return {
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    motion: new Proxy({}, {
      get: (_target, tag: string) => {
        const MotionComponent = ({ children, ...props }: Record<string, unknown> & { children?: React.ReactNode }) =>
          React.createElement(tag, omitMotionProps(props), children);
        MotionComponent.displayName = `motion.${tag}`;
        return MotionComponent;
      },
    }),
  };
});

function jsonResponse(body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

describe("PracticePageClient", () => {
  beforeEach(() => {
    routerPush.mockReset();
    localStorage.clear();
    sessionStorage.clear();
    vi.stubGlobal("fetch", vi.fn(async (url: string | URL | Request) => {
      const value = String(url);
      if (value === "/api/onboarding") {
        return jsonResponse({
          onboardingRole: "Backend Developer",
          onboardingCompany: "Google",
          onboardingLevel: "senior",
          onboardingGoal: "switch-companies",
          preferredInterviewType: "technical",
        });
      }
      if (value === "/api/resume") {
        return jsonResponse({ resumeText: null });
      }
      return jsonResponse({});
    }));
    vi.stubGlobal("crypto", {
      randomUUID: vi.fn(() => "interview-1"),
    });
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("keeps explicit retake defaults from being overwritten by onboarding defaults", async () => {
    render(
      <PracticePageClient
        retakeDefaults={{
          role: "Frontend Developer",
          type: "behavioral-leadership",
          difficulty: "medium",
        }}
      />,
    );

    await waitFor(() => expect(fetch).toHaveBeenCalledWith("/api/onboarding", { method: "GET" }));

    fireEvent.click(screen.getByRole("button", { name: /continue/i }));
    fireEvent.click(screen.getByRole("button", { name: /^start interview$/i }));

    const payload = JSON.parse(sessionStorage.getItem("pending_interview_interview-1") ?? "{}") as Record<string, unknown>;

    expect(payload).toMatchObject({
      role: "Frontend Developer",
      type: "behavioral-leadership",
      difficulty: "medium",
      persona: "balanced",
      questionCount: 10,
    });
    expect(payload.company).toBeUndefined();
    expect(routerPush).toHaveBeenCalledWith("/interview/interview-1");
  });
});
