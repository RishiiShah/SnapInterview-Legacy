"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

const EASE = [0.16, 1, 0.3, 1] as const;

const HEADLINE_LINES = [
  "Practice real interviews",
  "with AI that talks back.",
] as const;

/**
 * Headline: text stays locked in place — a clip wipe reveals each line.
 * No translate / letter-spacing (those make copy "land" somewhere else).
 */
export function HeroHeadline() {
  const reducedMotion = useReducedMotion() ?? false;

  return (
    <motion.h1
      className="text-[clamp(2.5rem,5vw,4.25rem)] font-bold leading-[1.06] tracking-[-0.035em] text-white"
      aria-label="Practice real interviews with AI that talks back."
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: {
          transition: {
            staggerChildren: reducedMotion ? 0 : 0.23,
            delayChildren: reducedMotion ? 0 : 0.12,
          },
        },
      }}
    >
      {HEADLINE_LINES.map((line) => (
        <motion.span
          key={line}
          className="block"
          variants={{
            hidden: reducedMotion
              ? { clipPath: "inset(0 0% 0 0)", opacity: 1 }
              : { clipPath: "inset(0 100% 0 0)", opacity: 1 },
            visible: {
              clipPath: "inset(0 0% 0 0)",
              opacity: 1,
              transition: reducedMotion
                ? { duration: 0 }
                : { duration: 1.33, ease: EASE },
            },
          }}
          style={{ willChange: reducedMotion ? "auto" : "clip-path" }}
        >
          {line}
        </motion.span>
      ))}
    </motion.h1>
  );
}

/** Subcopy: right-to-left clip wipe (opposite of the headline). */
export function HeroSubcopy({ children, className }: { children: ReactNode; className?: string }) {
  const reducedMotion = useReducedMotion() ?? false;

  return (
    <motion.p
      className={className}
      initial={
        reducedMotion
          ? false
          : { clipPath: "inset(0 0 0 100%)", opacity: 1 }
      }
      animate={{ clipPath: "inset(0 0 0 0%)", opacity: 1 }}
      transition={
        reducedMotion
          ? { duration: 0 }
          : { delay: 0.59, duration: 1.19, ease: EASE }
      }
      style={{ willChange: reducedMotion ? "auto" : "clip-path" }}
    >
      {children}
    </motion.p>
  );
}

/** Primary CTA: soft scale + fade settle (tactile, unlike the clip wipes). */
export function HeroCtaPrimary({ children, className }: { children: ReactNode; className?: string }) {
  const reducedMotion = useReducedMotion() ?? false;

  return (
    <motion.div
      className={className}
      initial={reducedMotion ? false : { opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={
        reducedMotion
          ? { duration: 0 }
          : { delay: 0.79, duration: 0.99, ease: EASE }
      }
      style={{
        transformOrigin: "center center",
        willChange: reducedMotion ? "auto" : "transform, opacity",
      }}
    >
      {children}
    </motion.div>
  );
}

/** Secondary CTA: quiet fade — center-out clip starts as a mid-slice of the label. */
export function HeroCtaSecondary({ children, className }: { children: ReactNode; className?: string }) {
  const reducedMotion = useReducedMotion() ?? false;

  return (
    <motion.div
      className={className}
      initial={reducedMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={
        reducedMotion
          ? { duration: 0 }
          : { delay: 0.89, duration: 0.99, ease: EASE }
      }
    >
      {children}
    </motion.div>
  );
}
