// @vitest-environment jsdom

import React from "react";
import { cleanup, render } from "@testing-library/react";
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

import { LandingFadeInStagger, LandingFadeInStaggerItem } from "./LandingMotion";

describe("landing motion", () => {
  afterEach(() => {
    cleanup();
    lastMotionProps.current = null;
  });

  it("keeps stagger items visible if viewport animation does not trigger", () => {
    render(
      <LandingFadeInStagger triggerOnView>
        <LandingFadeInStaggerItem>Visible step</LandingFadeInStaggerItem>
      </LandingFadeInStagger>,
    );

    expect(lastMotionProps.current).toMatchObject({
      initial: false,
      animate: "visible",
    });
  });
});
