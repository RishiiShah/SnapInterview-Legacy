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
  up: { y: 20, x: 0 },
  down: { y: -20, x: 0 },
  left: { x: 20, y: 0 },
  right: { x: -20, y: 0 },
  none: { x: 0, y: 0 },
} as const;

export function LandingFadeIn({
  children,
  className,
  delay = 0,
  direction = "up",
  triggerOnView = false,
  ...rest
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  direction?: keyof typeof directions;
  triggerOnView?: boolean;
} & LandingMotionDivProps) {
  const reducedMotion = useReducedMotion() ?? false;
  const visible = { opacity: 1, x: 0, y: 0 };

  return (
    <motion.div
      initial={reducedMotion ? false : { opacity: 0, ...directions[direction] }}
      {...(triggerOnView && !reducedMotion
        ? {
            whileInView: visible,
            viewport: { once: true, margin: "-40px" },
          }
        : {
            animate: visible,
          })}
      transition={
        reducedMotion
          ? { duration: 0 }
          : { duration: 0.38, delay, ease: [0.21, 0.47, 0.32, 0.98] }
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
  ...rest
}: {
  children: ReactNode;
  className?: string;
  triggerOnView?: boolean;
} & LandingMotionDivProps) {
  const reducedMotion = useReducedMotion() ?? false;

  return (
    <motion.div
      initial={reducedMotion ? false : "hidden"}
      {...(triggerOnView && !reducedMotion
        ? {
            whileInView: "visible",
            viewport: { once: true, margin: "-100px" },
          }
        : {
            animate: "visible",
          })}
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: reducedMotion ? 0 : 0.07 } },
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
  ...rest
}: {
  children: ReactNode;
  className?: string;
} & LandingMotionDivProps) {
  const reducedMotion = useReducedMotion() ?? false;
  const animationProps = { initial: false, animate: "visible" as const };

  return (
    <motion.div
      {...animationProps}
      variants={{
        hidden: { opacity: 0, y: 30 },
        visible: {
          opacity: 1,
          y: 0,
          transition: {
            type: "spring",
            damping: 18,
            stiffness: 132,
            mass: 0.9,
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
