// @vitest-environment jsdom

import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import CTASection from "./CTASection";
import FeaturesSection from "./FeaturesSection";
import HeroSection from "./HeroSection";
import HeroWorkspace from "./HeroWorkspace";
import HowItWorksSection from "./HowItWorksSection";
import LandingNavbar from "./LandingNavbar";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("next/image", () => ({
  default: ({ src, alt, ...props }: { src: string; alt: string; [key: string]: unknown }) => (
    <img src={src} alt={alt} {...props} />
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

  it("renders hero section with headline and action buttons", () => {
    render(
      <>
        <LandingNavbar />
        <HeroSection />
      </>,
    );

    expect(
      screen.getByText(/practice real interviews/i),
    ).toBeTruthy();
    expect(screen.getByRole("link", { name: /try for free today/i })).toBeTruthy();
    expect(screen.getByRole("link", { name: /see how it works/i })).toBeTruthy();
  });

  it("renders interactive workspace component", () => {
    render(<HeroWorkspace />);

    expect(
      screen.getByText(/Given an array of integers/i),
    ).toBeTruthy();
    expect(screen.getByText(/Two Sum/i)).toBeTruthy();
    expect(screen.getByText(/4\/4 test cases passed/i)).toBeTruthy();
  });

  it("keeps the floating navbar actions available", () => {
    render(<LandingNavbar />);

    expect(screen.getByRole("link", { name: /start free/i }).getAttribute("href")).toBe("/signup");
    expect(screen.getByRole("link", { name: /login/i }).getAttribute("href")).toBe("/login");
    expect(screen.getAllByRole("link", { name: /^studio$/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: /^features$/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: /how it works/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: /get started/i }).length).toBeGreaterThan(0);

    const openMenuButton = screen.getByRole("button", { name: /open navigation menu/i });
    fireEvent.click(openMenuButton);
    expect(screen.getByRole("button", { name: /close navigation menu/i })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /close navigation menu/i }));
    expect(screen.getByRole("button", { name: /open navigation menu/i })).toBeTruthy();
  });

  it("renders features, process, and CTA sections", () => {
    render(
      <>
        <FeaturesSection />
        <HowItWorksSection />
        <CTASection />
      </>,
    );

    expect(screen.getByText("Product Strengths")).toBeTruthy();
    expect(screen.getByText(/Speaks like a real interviewer/i)).toBeTruthy();
    expect(screen.getByText(/The AI listens to your full response/i)).toBeTruthy();
    expect(screen.getByText(/Write and run code in the browser/i)).toBeTruthy();
    expect(screen.getByText(/Review exactly what you said/i)).toBeTruthy();
    expect(screen.getByText(/Questions shaped by your context/i)).toBeTruthy();
    expect(screen.getByText(/Three steps to interview mastery/i)).toBeTruthy();
    expect(screen.getByText(/Your next interview won't be your first/i)).toBeTruthy();
    expect(screen.getByText(/Ready to simplify interview prep/i)).toBeTruthy();
    expect(screen.getByRole("link", { name: /get started free/i })).toBeTruthy();
    expect(screen.getByText(/Session review/i)).toBeTruthy();
  });
});
