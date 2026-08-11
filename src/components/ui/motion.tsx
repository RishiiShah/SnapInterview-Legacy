"use client";

import { motion, type HTMLMotionProps } from "framer-motion";
import { ReactNode } from "react";

type BaseMotionDivProps = Omit<
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

export function FadeInStagger({
  children,
  className,
  triggerOnView = false,
  instant = false,
  ...rest
}: {
  children: ReactNode;
  className?: string;
  triggerOnView?: boolean;
  /** Skip entrance animation (use when replacing a route loading skeleton). */
  instant?: boolean;
} & BaseMotionDivProps) {
  return (
    <motion.div
      initial={instant ? false : "hidden"}
      {...(instant
        ? {}
        : triggerOnView
          ? {
              whileInView: "visible",
              viewport: { once: true, margin: "-100px" },
            }
          : {
              animate: "visible",
            })}
      variants={
        instant
          ? undefined
          : {
              hidden: {},
              visible: {
                transition: {
                  staggerChildren: 0.07,
                },
              },
            }
      }
      className={className}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

export function FadeInStaggerItem({
  children,
  className,
  instant = false,
  ...rest
}: {
  children: ReactNode;
  className?: string;
  instant?: boolean;
} & BaseMotionDivProps) {
  return (
    <motion.div
      initial={instant ? false : undefined}
      variants={
        instant
          ? undefined
          : {
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
            }
      }
      className={className}
      style={instant ? undefined : { willChange: "transform, opacity" }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

export function FadeIn({
  children,
  className,
  delay = 0,
  direction = "up",
  triggerOnView = false,
  instant = false,
  ...rest
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  direction?: "up" | "down" | "left" | "right" | "none";
  triggerOnView?: boolean;
  /** Skip entrance animation (use when replacing a route loading skeleton). */
  instant?: boolean;
} & BaseMotionDivProps) {
  const directions = {
    up: { y: 20, x: 0 },
    down: { y: -20, x: 0 },
    left: { x: 20, y: 0 },
    right: { x: -20, y: 0 },
    none: { x: 0, y: 0 },
  };

  return (
    <motion.div
      initial={instant ? false : { opacity: 0, ...directions[direction] }}
      {...(instant
        ? {}
        : triggerOnView
          ? {
              whileInView: { opacity: 1, x: 0, y: 0 },
              viewport: { once: true, margin: "-40px" },
            }
          : {
              animate: { opacity: 1, x: 0, y: 0 },
            })}
      transition={
        instant
          ? undefined
          : {
              duration: 0.38,
              delay,
              ease: [0.21, 0.47, 0.32, 0.98],
            }
      }
      className={className}
      style={instant ? undefined : { willChange: "transform, opacity" }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

export function SlideIn({
  children,
  className,
  delay = 0,
  instant = false,
  ...rest
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  /** Skip entrance animation (use when replacing a route loading skeleton). */
  instant?: boolean;
} & BaseMotionDivProps) {
  return (
    <motion.div
      initial={instant ? false : { opacity: 0, y: 40 }}
      animate={instant ? undefined : { opacity: 1, y: 0 }}
      transition={
        instant
          ? undefined
          : {
              type: "spring",
              damping: 20,
              stiffness: 148,
              delay,
            }
      }
      className={className}
      style={instant ? undefined : { willChange: "transform, opacity" }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}
