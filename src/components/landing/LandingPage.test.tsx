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

  it("marks the landing sections for restrained reveal motion", () => {
    render(
      <>
        <FeaturesSection />
        <HowItWorksSection />
        <CTASection />
      </>,
    );

    expect(document.querySelectorAll("[data-landing-reveal]").length).toBeGreaterThan(0);
    expect(document.querySelector("[data-landing-connector]")).toBeTruthy();
    expect(document.querySelector("[data-landing-cta-aura]")).toBeTruthy();
  });
});
