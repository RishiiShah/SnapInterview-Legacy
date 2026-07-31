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

vi.mock("next/image", () => ({
  default: ({ src, alt, ...props }: { src: string; alt: string; [key: string]: unknown }) => (
    <img src={src} alt={alt} {...props} />
  ),
}));

vi.mock("framer-motion", () => {
  const omit = (props: Record<string, unknown>) =>
    Object.fromEntries(
      Object.entries(props).filter(
        ([key]) =>
          !["animate", "initial", "transition", "variants", "style"].includes(key),
      ),
    );
  return {
    motion: new Proxy(
      {},
      {
        get: (_t, tag: string) =>
          ({ children, ...props }: Record<string, unknown> & { children?: React.ReactNode }) =>
            React.createElement(tag, omit(props), children),
      },
    ),
    useReducedMotion: () => false,
  };
});

describe("hero background image", () => {
  afterEach(cleanup);

  it("renders high resolution full bleed starry night background image", () => {
    render(<HeroSection />);

    const bgImage = document.querySelector("img");
    expect(bgImage).toBeTruthy();
    expect(bgImage?.getAttribute("src")).toContain("hero-starry-bg.jpg");
  });
});
