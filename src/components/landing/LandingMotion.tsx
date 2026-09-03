"use client";

import {
  motion,
  useInView,
  useReducedMotion,
  type HTMLMotionProps,
} from "framer-motion";
import { useEffect, useRef, useState, type ReactNode } from "react";

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

export const LANDING_EASE = [0.16, 1, 0.3, 1] as const;

const DEFAULT_DURATION = 1.33;

const IN_VIEW_OPTS = {
  once: true,
  amount: 0.2,
  // Negative bottom margin: reveal naturally right as block approaches viewport.
  margin: "0px 0px -8% 0px",
} as const;

export type ClipMode =
  | "leftRight"
  | "rightLeft"
  | "bottomUp"
  | "topDown"
  | "centerOut"
  | "cornerBl";

const CLIP_HIDDEN: Record<ClipMode, string> = {
  leftRight: "inset(0 100% 0 0)",
  rightLeft: "inset(0 0 0 100%)",
  bottomUp: "inset(100% 0 0 0)",
  topDown: "inset(0 0 100% 0)",
  centerOut: "inset(45% 45% 45% 45%)",
  cornerBl: "circle(0% at 0% 100%)",
};

const CLIP_VISIBLE: Record<ClipMode, string> = {
  leftRight: "inset(0 0% 0 0)",
  rightLeft: "inset(0 0 0 0%)",
  bottomUp: "inset(0% 0 0 0)",
  topDown: "inset(0 0 0% 0)",
  centerOut: "inset(0% 0% 0% 0%)",
  cornerBl: "circle(160% at 0% 100%)",
};

/** True when the node has entered view, or was fully scrolled past without intersecting. */
function useRevealGate(triggerOnView: boolean, reducedMotion: boolean) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, IN_VIEW_OPTS);
  const [passed, setPassed] = useState(false);

  useEffect(() => {
    if (!triggerOnView || reducedMotion || passed) return;
    const el = ref.current;
    if (!el) return;

    const check = () => {
      const { bottom } = el.getBoundingClientRect();
      // Only catch-up if the block has fully left above the viewport (fast scroll miss).
      if (bottom < 0) {
        setPassed(true);
      }
    };

    check();
    window.addEventListener("scroll", check, { passive: true });
    window.addEventListener("resize", check);
    return () => {
      window.removeEventListener("scroll", check);
      window.removeEventListener("resize", check);
    };
  }, [triggerOnView, reducedMotion, passed]);

  const show = reducedMotion || !triggerOnView || inView || passed;
  return { ref, show };
}

/**
 * Clip wipe reveal. Outer node is never clipped (so IO can fire);
 * inner node owns the clip-path animation.
 */
export function LandingClipReveal({
  children,
  className,
  delay = 0,
  triggerOnView = false,
  mode = "leftRight",
  duration = DEFAULT_DURATION,
  ...rest
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  triggerOnView?: boolean;
  mode?: ClipMode;
  duration?: number;
} & LandingMotionDivProps) {
  const reducedMotion = useReducedMotion() ?? false;
  const { ref, show } = useRevealGate(triggerOnView, reducedMotion);

  return (
    <div ref={ref} className={className} {...(rest as object)}>
      <motion.div
        initial={false}
        animate={
          show
            ? { clipPath: CLIP_VISIBLE[mode] }
            : { clipPath: CLIP_HIDDEN[mode] }
        }
        transition={
          reducedMotion
            ? { duration: 0 }
            : { duration, delay: show ? delay : 0, ease: LANDING_EASE }
        }
        style={{ willChange: reducedMotion ? "auto" : "clip-path" }}
      >
        {children}
      </motion.div>
    </div>
  );
}

/** Soft scale + fade settle. */
export function LandingScaleIn({
  children,
  className,
  delay = 0,
  triggerOnView = false,
  scaleFrom = 0.97,
  duration = 1.01,
  ...rest
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  triggerOnView?: boolean;
  scaleFrom?: number;
  duration?: number;
} & LandingMotionDivProps) {
  const reducedMotion = useReducedMotion() ?? false;
  const { ref, show } = useRevealGate(triggerOnView, reducedMotion);

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={false}
      animate={
        show
          ? { opacity: 1, scale: 1 }
          : { opacity: 0, scale: scaleFrom }
      }
      transition={
        reducedMotion
          ? { duration: 0 }
          : { duration, delay: show ? delay : 0, ease: LANDING_EASE }
      }
      style={{
        transformOrigin: "center center",
        willChange: reducedMotion ? "auto" : "transform, opacity",
      }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

/** Opacity-only settle. */
export function LandingFadeOnly({
  children,
  className,
  delay = 0,
  triggerOnView = false,
  duration = 1.01,
  ...rest
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  triggerOnView?: boolean;
  duration?: number;
} & LandingMotionDivProps) {
  const reducedMotion = useReducedMotion() ?? false;
  const { ref, show } = useRevealGate(triggerOnView, reducedMotion);

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={false}
      animate={{ opacity: show ? 1 : 0 }}
      transition={
        reducedMotion
          ? { duration: 0 }
          : { duration, delay: show ? delay : 0, ease: LANDING_EASE }
      }
      {...rest}
    >
      {children}
    </motion.div>
  );
}

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
  direction?: "up" | "down" | "left" | "right" | "none";
  triggerOnView?: boolean;
  scaleFrom?: number;
  duration?: number;
} & LandingMotionDivProps) {
  const directions = {
    up: { y: 16, x: 0 },
    down: { y: -16, x: 0 },
    left: { x: 20, y: 0 },
    right: { x: -20, y: 0 },
    none: { x: 0, y: 0 },
  };
  const reducedMotion = useReducedMotion() ?? false;
  const { ref, show } = useRevealGate(triggerOnView, reducedMotion);

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={false}
      animate={
        show
          ? {
              opacity: 1,
              x: 0,
              y: 0,
              ...(scaleFrom !== undefined ? { scale: 1 } : {}),
            }
          : {
              opacity: 0,
              ...directions[direction],
              ...(scaleFrom !== undefined ? { scale: scaleFrom } : {}),
            }
      }
      transition={
        reducedMotion
          ? { duration: 0 }
          : { duration, delay: show ? delay : 0, ease: LANDING_EASE }
      }
      style={{ willChange: reducedMotion ? "auto" : "transform, opacity" }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}
