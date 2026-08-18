// @vitest-environment jsdom

import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MAX_RESUME_PDF_BYTES } from "@/lib/resume-upload";
import PracticePageClient from "./PracticePageClient";

const { routerPush, preloadKokoro } = vi.hoisted(() => ({
  routerPush: vi.fn(),
  preloadKokoro: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: routerPush }),
}));

vi.mock("@/lib/tts/browser-tts", () => ({ isLocalTtsEnabled: () => true }));
vi.mock("@/lib/tts/kokoro-worker-client", () => ({
  getSharedKokoroWorkerClient: () => ({ preload: preloadKokoro }),
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
    preloadKokoro.mockReset();
    preloadKokoro.mockResolvedValue(undefined);
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
      durationMinutes: 30,
      questionCount: 10,
    });
    expect(payload.company).toBeUndefined();
    expect(preloadKokoro).toHaveBeenCalledTimes(1);
    expect(preloadKokoro.mock.invocationCallOrder[0]).toBeLessThan(routerPush.mock.invocationCallOrder[0]!);
    expect(routerPush).toHaveBeenCalledWith("/interview/interview-1");
  });

  it("uses server-provided onboarding and resume defaults without duplicate browser requests", () => {
    render(
      <PracticePageClient
        initialDefaults={{
          onboarding: {
            onboardingRole: "Platform Engineer",
            onboardingCompany: "OpenAI",
            onboardingLevel: "senior",
            onboardingGoal: "switch-companies",
            preferredInterviewType: "system-design",
          },
          resumeText: "Built reliable distributed systems.",
        }}
      />,
    );

    expect((screen.getByPlaceholderText("e.g. Software Engineer - Backend") as HTMLInputElement).value)
      .toBe("Platform Engineer");
    expect((screen.getByPlaceholderText("e.g. Google, Stripe, or General") as HTMLInputElement).value).toBe("OpenAI");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("uses an inline step-two action row instead of a fixed footer", () => {
    const { getByTestId } = render(
      <PracticePageClient
        retakeDefaults={{
          role: "Frontend Developer",
          type: "behavioral-leadership",
          difficulty: "medium",
        }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /continue/i }));

    expect(getByTestId("practice-step-two-actions").className).not.toContain("fixed");
    expect(getByTestId("practice-step-two-actions").className).not.toContain("border-t");
    expect(screen.queryByTestId("practice-step-two-footer")).toBeNull();
    expect(screen.getByRole("button", { name: /^start interview$/i })).not.toBeNull();
  });

  it("shows the uploaded resume after one successful request", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({
      resumeText: "Built distributed systems.",
    }));
    vi.stubGlobal("fetch", fetchMock);

    render(
      <PracticePageClient
        initialDefaults={{
          onboarding: {
            onboardingRole: "Backend Developer",
            onboardingCompany: "Google",
            onboardingLevel: "senior",
            onboardingGoal: "switch-companies",
            preferredInterviewType: "coding-algorithms",
          },
          resumeText: null,
        }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /continue/i }));
    fireEvent.change(screen.getByLabelText(/upload pdf resume/i), {
      target: {
        files: [new File(["pdf"], "resume.pdf", { type: "application/pdf" })],
      },
    });

    expect(await screen.findByRole("button", { name: /view document/i })).toBeDefined();
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("keeps an existing resume visible when an oversized replacement is rejected", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    render(
      <PracticePageClient
        initialDefaults={{
          onboarding: {
            onboardingRole: "Backend Developer",
            onboardingCompany: "Google",
            onboardingLevel: "senior",
            onboardingGoal: "switch-companies",
            preferredInterviewType: "coding-algorithms",
          },
          resumeText: "Existing distributed-systems experience.",
        }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /continue/i }));
    fireEvent.change(screen.getByLabelText(/^replace$/i), {
      target: {
        files: [
          new File(
            [new Uint8Array(MAX_RESUME_PDF_BYTES + 1)],
            "oversized.pdf",
            { type: "application/pdf" },
          ),
        ],
      },
    });

    expect(
      await screen.findByText("File too large. Choose a PDF smaller than 4 MB."),
    ).toBeDefined();
    expect(screen.getByRole("button", { name: /view document/i })).toBeDefined();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
