// @vitest-environment jsdom

import React from "react";
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import HeroSection from "./HeroSection";

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
    "style",
    "transition",
    "variants",
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

describe("hero aurora background", () => {
  afterEach(cleanup);

  it("animates the existing gradient blobs and wave", () => {
    render(<HeroSection />);

    const aurora = document.querySelector("[data-landing-aurora]");
    const blobs = document.querySelectorAll("[data-landing-aurora-blob]");
    const wave = document.querySelector("[data-landing-aurora-wave]");
    const paths = document.querySelectorAll("[data-landing-aurora-path]");

    expect(aurora).toBeTruthy();
    expect(aurora?.className).toContain("inset-0");
    expect(blobs).toHaveLength(3);
    expect(Array.from(blobs).every((blob) => blob.className.includes("landing-hero-aurora-blob"))).toBe(true);
    expect(wave?.getAttribute("class")).toContain("landing-hero-aurora-wave");
    expect(paths).toHaveLength(2);
    expect(Array.from(paths).every((path) => path.getAttribute("class")?.includes("landing-hero-aurora-path"))).toBe(true);
  });
});
