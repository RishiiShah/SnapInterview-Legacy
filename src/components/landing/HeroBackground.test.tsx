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

describe("hero background image", () => {
  afterEach(cleanup);

  it("renders high resolution full bleed starry night background image", () => {
    render(<HeroSection />);

    const bgImage = document.querySelector("img");
    expect(bgImage).toBeTruthy();
    expect(bgImage?.getAttribute("src")).toContain("hero-starry-bg.jpg");
  });
});
