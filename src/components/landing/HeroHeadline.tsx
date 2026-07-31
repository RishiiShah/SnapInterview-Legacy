"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

const EASE = [0.45, 0.05, 0.55, 0.95] as const;

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
            staggerChildren: reducedMotion ? 0 : 0.28,
            delayChildren: reducedMotion ? 0 : 0.2,
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
                : { duration: 1.15, ease: EASE },
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
          : { delay: 0.85, duration: 1.2, ease: EASE }
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
      initial={reducedMotion ? false : { opacity: 0, scale: 0.86 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={
        reducedMotion
          ? { duration: 0 }
          : { delay: 1.15, duration: 0.85, ease: EASE }
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

/** Secondary CTA: reveal expands from the center out to the corners. */
export function HeroCtaSecondary({ children, className }: { children: ReactNode; className?: string }) {
  const reducedMotion = useReducedMotion() ?? false;

  return (
    <motion.div
      className={className}
      initial={
        reducedMotion
          ? false
          : { clipPath: "inset(50% 50% 50% 50%)", opacity: 1 }
      }
      animate={{ clipPath: "inset(0% 0% 0% 0%)", opacity: 1 }}
      transition={
        reducedMotion
          ? { duration: 0 }
          : { delay: 1.4, duration: 0.95, ease: EASE }
      }
      style={{ willChange: reducedMotion ? "auto" : "clip-path" }}
    >
      {children}
    </motion.div>
  );
}
