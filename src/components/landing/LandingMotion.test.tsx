// @vitest-environment jsdom

import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const lastMotionProps = vi.hoisted(() => ({
  current: null as Record<string, unknown> | null,
}));

vi.mock("framer-motion", () => ({
  motion: {
    div: (props: Record<string, unknown>) => {
      lastMotionProps.current = props;
      const { children, ...domProps } = props;
      return React.createElement("div", domProps, children as React.ReactNode);
    },
  },
  useReducedMotion: () => false,
}));

import {
  LandingFadeIn,
  LandingFadeInStagger,
  LandingFadeInStaggerItem,
} from "./LandingMotion";

describe("landing motion", () => {
  afterEach(() => {
    cleanup();
    lastMotionProps.current = null;
  });

  it("exposes hidden/visible variants on stagger items for parent-driven reveals", () => {
    render(
      <LandingFadeInStagger triggerOnView>
        <LandingFadeInStaggerItem>Visible step</LandingFadeInStaggerItem>
      </LandingFadeInStagger>,
    );

    expect(lastMotionProps.current?.variants).toMatchObject({
      hidden: { opacity: 0, y: 56, x: 0 },
      visible: expect.objectContaining({ opacity: 1, y: 0, x: 0 }),
    });
    expect(screen.getByText("Visible step")).toBeTruthy();
  });

  it("supports scale-from fade for CTA-style reveals", () => {
    render(
      <LandingFadeIn triggerOnView scaleFrom={0.96}>
        Soft scale
      </LandingFadeIn>,
    );

    expect(lastMotionProps.current).toMatchObject({
      initial: { opacity: 0, y: 56, x: 0, scale: 0.96 },
      whileInView: { opacity: 1, x: 0, y: 0, scale: 1 },
    });
  });
});
