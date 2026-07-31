"use client";

import { motion, useReducedMotion, type HTMLMotionProps } from "framer-motion";
import type { ReactNode } from "react";

type LandingMotionDivProps = Omit<
  HTMLMotionProps<"div">,
  | "children"
  | "className"
  | "initial"
  | "animate"
  | "whileInView"
  | "viewport"
  | "transition"
  | "variants"
>;

const directions = {
  up: { y: 56, x: 0 },
  down: { y: -56, x: 0 },
  left: { x: 64, y: 0 },
  right: { x: -64, y: 0 },
  none: { x: 0, y: 0 },
} as const;

/** Even pacing so the full duration is actually felt. */
const EASE_IN_OUT = [0.45, 0.05, 0.55, 0.95] as const;

const DEFAULT_DURATION = 1.26;
const DEFAULT_STAGGER = 0.21;

export function LandingFadeIn({
  children,
  className,
  delay = 0,
  direction = "up",
  triggerOnView = false,
  scaleFrom,
  duration = DEFAULT_DURATION,
  ...rest
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  direction?: keyof typeof directions;
  triggerOnView?: boolean;
  /** When set, fades in from this scale (e.g. 0.96) to 1. */
  scaleFrom?: number;
  duration?: number;
} & LandingMotionDivProps) {
  const reducedMotion = useReducedMotion() ?? false;
  const visible = {
    opacity: 1,
    x: 0,
    y: 0,
    ...(scaleFrom !== undefined ? { scale: 1 } : {}),
  };
  const hidden = {
    opacity: 0,
    ...directions[direction],
    ...(scaleFrom !== undefined ? { scale: scaleFrom } : {}),
  };

  return (
    <motion.div
      initial={reducedMotion ? false : hidden}
      {...(triggerOnView && !reducedMotion
        ? {
            whileInView: visible,
            viewport: { once: true, margin: "-60px", amount: 0.2 },
          }
        : {
            animate: visible,
          })}
      transition={
        reducedMotion
          ? { duration: 0 }
          : { duration, delay, ease: EASE_IN_OUT }
      }
      className={className}
      style={{ willChange: reducedMotion ? "auto" : "transform, opacity" }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

export function LandingFadeInStagger({
  children,
  className,
  triggerOnView = false,
  stagger = DEFAULT_STAGGER,
  ...rest
}: {
  children: ReactNode;
  className?: string;
  triggerOnView?: boolean;
  stagger?: number;
} & LandingMotionDivProps) {
  const reducedMotion = useReducedMotion() ?? false;

  return (
    <motion.div
      initial={reducedMotion ? false : "hidden"}
      {...(triggerOnView && !reducedMotion
        ? {
            whileInView: "visible",
            viewport: { once: true, margin: "-60px", amount: 0.15 },
          }
        : {
            animate: "visible",
          })}
      variants={{
        hidden: {},
        visible: {
          transition: { staggerChildren: reducedMotion ? 0 : stagger, delayChildren: reducedMotion ? 0 : 0.07 },
        },
      }}
      className={className}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

export function LandingFadeInStaggerItem({
  children,
  className,
  direction = "up",
  ...rest
}: {
  children: ReactNode;
  className?: string;
  direction?: keyof typeof directions;
} & LandingMotionDivProps) {
  const reducedMotion = useReducedMotion() ?? false;

  return (
    <motion.div
      variants={{
        hidden: reducedMotion
          ? { opacity: 1, x: 0, y: 0 }
          : { opacity: 0, ...directions[direction] },
        visible: {
          opacity: 1,
          x: 0,
          y: 0,
          transition: reducedMotion
            ? { duration: 0 }
            : {
                duration: DEFAULT_DURATION,
                ease: EASE_IN_OUT,
              },
        },
      }}
      className={className}
      style={{ willChange: reducedMotion ? "auto" : "transform, opacity" }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}
