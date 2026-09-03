"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { motion, useAnimate } from "framer-motion";
import type { SVGMotionProps } from "framer-motion";

export interface AnimatedIconProps extends Omit<
  SVGMotionProps<SVGSVGElement>,
  "ref"
> {
  size?: number | string;
  color?: string;
  strokeWidth?: number;
  className?: string;
  isHovered?: boolean;
}

export interface AnimatedIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

function useHoverAnimation(isHovered: boolean | undefined, start: () => void, stop: () => void) {
  const startRef = useRef(start);
  const stopRef = useRef(stop);
  
  useEffect(() => {
    startRef.current = start;
    stopRef.current = stop;
  }, [start, stop]);

  useEffect(() => {
    if (isHovered === true) startRef.current();
    else if (isHovered === false) stopRef.current();
  }, [isHovered]);
}

// 8. BellIcon
export const AnimatedBellIcon = forwardRef<AnimatedIconHandle, AnimatedIconProps>(
  ({ size = 24, color = "currentColor", strokeWidth = 2.25, className = "", isHovered, ...svgProps }, ref) => {
    const [scope, animate] = useAnimate();
    const start = () => animate(".bell", { rotate: [0, 15, -15, 10, -10, 0] }, { duration: 0.6, ease: "easeInOut" });
    const stop = () => animate(".bell", { rotate: 0 }, { duration: 0.2 });
    useImperativeHandle(ref, () => ({ startAnimation: start, stopAnimation: stop }));

    useHoverAnimation(isHovered, start, stop);

    return (
      <motion.svg
        {...svgProps}
        ref={scope} xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
        fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"
        className={`icon-crisp ${className} cursor-pointer`.trim()} onHoverStart={start} onHoverEnd={stop}
      >
        <motion.g className="bell" style={{ transformOrigin: "top center" }}>
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </motion.g>
      </motion.svg>
    );
  }
);
AnimatedBellIcon.displayName = "AnimatedBellIcon";

// 9. SearchIcon
export const AnimatedSearchIcon = forwardRef<AnimatedIconHandle, AnimatedIconProps>(
  ({ size = 24, color = "currentColor", strokeWidth = 2.25, className = "", isHovered, ...svgProps }, ref) => {
    const [scope, animate] = useAnimate();
    const start = () => animate(".search-glass", { rotate: [0, 15, -10, 0] }, { duration: 0.6, ease: "easeInOut" });
    const stop = () => animate(".search-glass", { rotate: 0 }, { duration: 0.2 });
    useImperativeHandle(ref, () => ({ startAnimation: start, stopAnimation: stop }));

    useHoverAnimation(isHovered, start, stop);

    return (
      <motion.svg
        {...svgProps}
        ref={scope} xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
        fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"
        className={`icon-crisp ${className} cursor-pointer`.trim()} onHoverStart={start} onHoverEnd={stop}
      >
        <motion.g className="search-glass" style={{ transformOrigin: "11px 11px" }}>
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </motion.g>
      </motion.svg>
    );
  }
);
AnimatedSearchIcon.displayName = "AnimatedSearchIcon";

// 10. Sidebar Open Icon
export const AnimatedSidebarOpenIcon = forwardRef<AnimatedIconHandle, AnimatedIconProps>(
  ({ size = 24, color = "currentColor", strokeWidth = 2.25, className = "", isHovered, ...svgProps }, ref) => {
    const [scope, animate] = useAnimate();

    const start = () => {
      animate(".chevron", { x: [0, 2, 0], opacity: [1, 0.7, 1] }, { duration: 1.1, ease: "easeInOut" });
      animate(".sidebar", { x: [0, 1.5, 0] }, { duration: 1.1, ease: "easeInOut" });
    };

    const stop = () => {
      animate(".chevron", { x: 0, opacity: 1 }, { duration: 0.18, ease: "easeInOut" });
      animate(".sidebar", { x: 0 }, { duration: 0.18, ease: "easeInOut" });
    };

    useImperativeHandle(ref, () => ({ startAnimation: start, stopAnimation: stop }));
    useHoverAnimation(isHovered, start, stop);

    return (
      <motion.svg
        {...svgProps}
        ref={scope} xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
        fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"
        className={`icon-crisp ${className} cursor-pointer`.trim()} onHoverStart={start} onHoverEnd={stop}
      >
        <path d="M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" />
        <motion.path className="sidebar" d="M15 4v16" />
        <motion.path className="chevron" d="M9 10l2 2l-2 2" opacity={1} />
      </motion.svg>
    );
  }
);
AnimatedSidebarOpenIcon.displayName = "AnimatedSidebarOpenIcon";

// 11. Sidebar Collapse Icon
export const AnimatedSidebarCollapseIcon = forwardRef<AnimatedIconHandle, AnimatedIconProps>(
  ({ size = 24, color = "currentColor", strokeWidth = 2.25, className = "", isHovered, ...svgProps }, ref) => {
    const [scope, animate] = useAnimate();

    const start = () => {
      animate(".chevron", { x: [0, -2, 0], opacity: [1, 0.7, 1] }, { duration: 1.1, ease: "easeInOut" });
      animate(".sidebar", { x: [0, -1.5, 0] }, { duration: 1.1, ease: "easeInOut" });
    };

    const stop = () => {
      animate(".chevron", { x: 0, opacity: 1 }, { duration: 0.18, ease: "easeInOut" });
      animate(".sidebar", { x: 0 }, { duration: 0.18, ease: "easeInOut" });
    };

    useImperativeHandle(ref, () => ({ startAnimation: start, stopAnimation: stop }));
    useHoverAnimation(isHovered, start, stop);

    return (
      <motion.svg
        {...svgProps}
        ref={scope} xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
        fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"
        className={`icon-crisp ${className} cursor-pointer`.trim()} onHoverStart={start} onHoverEnd={stop}
      >
        <path d="M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" />
        <motion.path className="sidebar" d="M9 4v16" />
        <motion.path className="chevron" d="M15 10l-2 2l2 2" opacity={1} />
      </motion.svg>
    );
  }
);
AnimatedSidebarCollapseIcon.displayName = "AnimatedSidebarCollapseIcon";
