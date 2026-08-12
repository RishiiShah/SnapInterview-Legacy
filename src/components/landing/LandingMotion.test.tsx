// @vitest-environment jsdom

import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const motionPropsLog = vi.hoisted(() => [] as Record<string, unknown>[]);
const MOTION_ONLY_PROPS = new Set([
  "animate",
  "exit",
  "initial",
  "transition",
  "variants",
  "viewport",
  "whileHover",
  "whileInView",
  "whileTap",
]);

vi.mock("framer-motion", () => ({
  motion: {
    div: React.forwardRef(function MotionDiv(
      props: Record<string, unknown> & { children?: React.ReactNode },
      ref: React.Ref<HTMLDivElement>,
    ) {
      motionPropsLog.push(props);
      const { children, ...domProps } = props;
      return React.createElement(
        "div",
        {
          ...Object.fromEntries(
            Object.entries(domProps).filter(([key]) => !MOTION_ONLY_PROPS.has(key)),
          ),
          ref,
        },
        children,
      );
    }),
  },
  useReducedMotion: () => false,
  useInView: () => true,
}));

import {
  LandingClipReveal,
  LandingClipStaggerItem,
  LandingFadeInStagger,
  LandingScaleIn,
} from "./LandingMotion";

describe("landing motion", () => {
  afterEach(() => {
    cleanup();
    motionPropsLog.length = 0;
  });

  it("animates clip-path on an inner node once revealed", () => {
    render(
      <LandingClipReveal triggerOnView mode="leftRight">
        Wipe
      </LandingClipReveal>,
    );

    expect(motionPropsLog[0]).toMatchObject({
      animate: { clipPath: "inset(0 0% 0 0)" },
    });
    expect(screen.getByText("Wipe")).toBeTruthy();
  });

  it("uses clip variants on stagger items", () => {
    render(
      <LandingFadeInStagger triggerOnView>
        <LandingClipStaggerItem mode="leftRight">Visible step</LandingClipStaggerItem>
      </LandingFadeInStagger>,
    );

    const clipNode = motionPropsLog.find((props) => {
      const variants = props.variants as { hidden?: { clipPath?: string } } | undefined;
      return variants?.hidden?.clipPath === "inset(0 100% 0 0)";
    });
    expect(clipNode).toBeTruthy();
    expect(screen.getByText("Visible step")).toBeTruthy();
  });

  it("supports soft scale settle", () => {
    render(
      <LandingScaleIn triggerOnView scaleFrom={0.9}>
        Soft scale
      </LandingScaleIn>,
    );

    expect(motionPropsLog.at(-1)).toMatchObject({
      animate: { opacity: 1, scale: 1 },
    });
  });
});
