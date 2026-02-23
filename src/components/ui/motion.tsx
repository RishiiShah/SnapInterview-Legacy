"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";

export function FadeInStagger({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-100px" }}
      variants={{
        hidden: {},
        visible: {
          transition: {
            staggerChildren: 0.10,
          },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function FadeInStaggerItem({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
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
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  direction?: "up" | "down" | "left" | "right" | "none";
}) {
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
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{
        duration: 0.5,
        delay,
        ease: [0.21, 0.47, 0.32, 0.98], // Custom easeOut cubic
      }}
      className={className}
      style={{ willChange: "transform, opacity" }}
    >
      {children}
    </motion.div>
  );
}

export function SlideIn({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
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
    >
      {children}
    </motion.div>
  );
}
