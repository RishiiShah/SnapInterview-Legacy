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
  ...rest
}: {
  children: ReactNode;
  className?: string;
  triggerOnView?: boolean;
} & BaseMotionDivProps) {
  return (
    <motion.div
      initial="hidden"
      {...(triggerOnView
        ? {
            whileInView: "visible",
            viewport: { once: true, margin: "-100px" },
          }
        : {
            animate: "visible",
          })}
      variants={{
        hidden: {},
        visible: {
          transition: {
            staggerChildren: 0.10,
          },
        },
      }}
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
  ...rest
}: {
  children: ReactNode;
  className?: string;
} & BaseMotionDivProps) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 30 },
        visible: {
          opacity: 1,
          y: 0,
          transition: {
            type: "spring",
            damping: 20,
            stiffness: 100,
          },
        },
      }}
      className={className}
      style={{ willChange: "transform, opacity" }}
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
  ...rest
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  direction?: "up" | "down" | "left" | "right" | "none";
  triggerOnView?: boolean;
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
      initial={{ opacity: 0, ...directions[direction] }}
      {...(triggerOnView
        ? {
            whileInView: { opacity: 1, x: 0, y: 0 },
            viewport: { once: true, margin: "-100px" },
          }
        : {
            animate: { opacity: 1, x: 0, y: 0 },
          })}
      transition={{
        duration: 0.5,
        delay,
        ease: [0.21, 0.47, 0.32, 0.98], // Custom easeOut cubic
      }}
      className={className}
      style={{ willChange: "transform, opacity" }}
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
  ...rest
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
} & BaseMotionDivProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        type: "spring",
        damping: 25,
        stiffness: 120,
        delay,
      }}
      className={className}
      style={{ willChange: "transform, opacity" }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}
