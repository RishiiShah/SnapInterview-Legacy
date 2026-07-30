// @vitest-environment jsdom

import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import CTASection from "./CTASection";
import FeaturesSection from "./FeaturesSection";
import HeroSection from "./HeroSection";
import HowItWorksSection from "./HowItWorksSection";
import LandingNavbar from "./LandingNavbar";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("framer-motion", () => {
  const motionPropNames = new Set([
    "animate",
    "exit",
    "initial",
    "transition",
    "variants",
    "viewport",
    "whileHover",
    "whileInView",
    "whileTap",
    "style",
  ]);
  const omitMotionProps = (props: Record<string, unknown>) =>
    Object.fromEntries(Object.entries(props).filter(([key]) => !motionPropNames.has(key)));

  return {
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

vi.mock("motion/react", () => {
  const motionPropNames = new Set([
    "animate",
    "exit",
    "initial",
    "layoutId",
    "style",
    "transition",
  ]);
  const omitMotionProps = (props: Record<string, unknown>) =>
    Object.fromEntries(Object.entries(props).filter(([key]) => !motionPropNames.has(key)));

  return {
    motion: new Proxy({}, {
      get: (_target, tag: string) => ({
        children,
        ...props
      }: Record<string, unknown> & { children?: React.ReactNode }) =>
        React.createElement(tag, omitMotionProps(props), children),
    }),
    AnimatePresence: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
    useMotionValueEvent: () => undefined,
    useScroll: () => ({ scrollY: {} }),
  };
});

describe("landing experience", () => {
  afterEach(cleanup);

  it("shows a coding interview flow and truthful post-answer review copy", () => {
    render(
      <>
        <LandingNavbar />
        <HeroSection />
      </>,
    );

    expect(
      screen.getByText(/Implement a function that returns the first non-repeating character/i),
    ).toBeTruthy();
    expect(screen.getByText("Answer review")).toBeTruthy();
    expect(screen.getByText(/4\/4 passed/i)).toBeTruthy();
    expect(screen.queryByText(/live\s+feedback/i)).toBeNull();
    expect(document.querySelector(".landing-workspace-shell .landing-workspace")).toBeTruthy();
  });

  it("wraps editor code instead of creating a horizontal scroller", () => {
    render(<HeroSection />);

    const codeEditor = screen.getByRole("region", { name: "Code editor" });
    const codeContent = codeEditor.querySelector("[data-landing-code-content]");

    expect(codeContent).toBeTruthy();
    expect(codeContent?.className).toContain("overflow-hidden");
    expect(codeContent?.className).not.toContain("overflow-x-auto");
  });

  it("widens hero copy and uses distinctive session CTAs", () => {
    render(<HeroSection />);

    const heroHeading = screen.getByRole("heading", { name: /practice real interviews with ai that talks back/i });
    const workspace = document.querySelector("[data-landing-hero-workspace]");
    const primaryCta = screen.getByRole("link", { name: /start practicing free/i });
    const secondaryCta = screen.getByRole("link", { name: /see how it works/i });

    expect(heroHeading.className).toContain("landing-hero-copy");
    expect(document.querySelector(".landing-hero-subcopy")).toBeTruthy();
    expect(document.querySelector(".landing-hero-accent")).toBeTruthy();
    expect(primaryCta.className).toContain("landing-hero-cta-primary");
    expect(secondaryCta.className).toContain("landing-hero-cta-secondary");
    expect(workspace?.querySelector(".landing-workspace-frame")).toBeTruthy();
    expect(workspace?.querySelectorAll(".landing-workspace-pane").length).toBe(3);
  });

  it("keeps the floating navbar actions available", () => {
    render(<LandingNavbar />);

    expect(screen.getByRole("link", { name: /get started free/i }).getAttribute("href")).toBe("/signup");
    expect(screen.getByRole("link", { name: /login/i }).getAttribute("href")).toBe("/login");

    const openMenuButton = screen.getByRole("button", { name: /open navigation menu/i });
    fireEvent.click(openMenuButton);
    expect(screen.getByRole("button", { name: /close navigation menu/i })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /close navigation menu/i }));
    expect(screen.getByRole("button", { name: /open navigation menu/i })).toBeTruthy();
  });

  it("renders compact below-hero sections without per-section glass cards", () => {
    render(
      <>
        <FeaturesSection />
        <HowItWorksSection />
        <CTASection />
      </>,
    );

    expect(document.querySelectorAll("[data-landing-feature-item]")).toHaveLength(3);
    expect(document.querySelectorAll("[data-landing-step-card]")).toHaveLength(3);
    expect(document.querySelectorAll("[data-landing-step-icon]")).toHaveLength(3);
    expect(document.querySelector("[data-landing-connector]")).toBeTruthy();
    expect(document.querySelector("[data-landing-cta-strip]")).toBeTruthy();
    expect(document.querySelectorAll(".landing-glass")).toHaveLength(0);
    expect(document.querySelectorAll(".landing-section-aura")).toHaveLength(0);
  });
});
