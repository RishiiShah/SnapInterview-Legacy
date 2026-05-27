"use client";

import { forwardRef, useImperativeHandle, useEffect } from "react";
import { motion, useAnimate } from "framer-motion";
import type { SVGProps } from "react";

export interface AnimatedIconProps extends Omit<SVGProps<SVGSVGElement>, "ref"> {
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

// 1. ClockIcon
export const AnimatedClockIcon = forwardRef<AnimatedIconHandle, AnimatedIconProps>(
  ({ size = 24, color = "currentColor", strokeWidth = 2, className = "", isHovered }, ref) => {
    const [scope, animate] = useAnimate();
    const start = () => animate(".clock-hands", { rotate: 360 }, { duration: 1, ease: "easeInOut" });
    const stop = () => animate(".clock-hands", { rotate: 0 }, { duration: 1, ease: "easeInOut" });
    useImperativeHandle(ref, () => ({ startAnimation: start, stopAnimation: stop }));

    useEffect(() => {
      if (isHovered === true) start();
      else if (isHovered === false) stop();
    }, [isHovered]);

    return (
      <motion.svg
        ref={scope} xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
        fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"
        className={`${className} cursor-pointer`} onHoverStart={start} onHoverEnd={stop}
      >
        <motion.circle cx="12" cy="12" r="10" />
        <motion.path d="M12 6v6l4 2" className="clock-hands" style={{ transformOrigin: "12px 12px" }} />
      </motion.svg>
    );
  }
);
AnimatedClockIcon.displayName = "AnimatedClockIcon";

// 2. ChartBarsIcon
export const AnimatedChartBarsIcon = forwardRef<AnimatedIconHandle, AnimatedIconProps>(
  ({ size = 24, color = "currentColor", strokeWidth = 2, className = "", isHovered }, ref) => {
    const [scope, animate] = useAnimate();
    const start = () => {
      const bars = Array.from(scope.current?.querySelectorAll(".bar") ?? []);
      bars.forEach((bar: any, index) => {
        animate(bar, { y: [0, -4, 0] }, { duration: 0.6, delay: index * 0.1 });
      });
    };
    const stop = () => animate(".bar", { y: 0 }, { duration: 0.3 });
    useImperativeHandle(ref, () => ({ startAnimation: start, stopAnimation: stop }));

    useEffect(() => {
      if (isHovered === true) start();
      else if (isHovered === false) stop();
    }, [isHovered]);

    return (
      <motion.svg
        ref={scope} xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
        fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"
        className={`${className} cursor-pointer`} onHoverStart={start} onHoverEnd={stop}
      >
        <motion.path d="M3 3v18h18" />
        <motion.path d="M18 17V9" className="bar" />
        <motion.path d="M13 17V5" className="bar" />
        <motion.path d="M8 17v-3" className="bar" />
      </motion.svg>
    );
  }
);
AnimatedChartBarsIcon.displayName = "AnimatedChartBarsIcon";

// 3. SparklesIcon
export const AnimatedSparklesIcon = forwardRef<AnimatedIconHandle, AnimatedIconProps>(
  ({ size = 24, color = "currentColor", strokeWidth = 2, className = "", isHovered }, ref) => {
    const [scope, animate] = useAnimate();
    const start = () => animate(".sparkle", { scale: [1, 1.3, 1], rotate: [0, 90, 180] }, { duration: 0.8 });
    const stop = () => animate(".sparkle", { scale: 1, rotate: 0 }, { duration: 0.3 });
    useImperativeHandle(ref, () => ({ startAnimation: start, stopAnimation: stop }));

    useEffect(() => {
      if (isHovered === true) start();
      else if (isHovered === false) stop();
    }, [isHovered]);

    return (
      <motion.svg
        ref={scope} xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
        fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"
        className={`${className} cursor-pointer`} onHoverStart={start} onHoverEnd={stop}
      >
        <motion.path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" className="sparkle" style={{ transformOrigin: "12px 12px" }} />
      </motion.svg>
    );
  }
);
AnimatedSparklesIcon.displayName = "AnimatedSparklesIcon";

// 4. VideoCameraIcon
export const AnimatedVideoCameraIcon = forwardRef<AnimatedIconHandle, AnimatedIconProps>(
  ({ size = 24, color = "currentColor", strokeWidth = 2, className = "", isHovered }, ref) => {
    const [scope, animate] = useAnimate();
    const start = () => animate(".camera", { scale: [1, 1.1, 1] }, { duration: 0.5 });
    const stop = () => animate(".camera", { scale: 1 }, { duration: 0.3 });
    useImperativeHandle(ref, () => ({ startAnimation: start, stopAnimation: stop }));

    useEffect(() => {
      if (isHovered === true) start();
      else if (isHovered === false) stop();
    }, [isHovered]);

    return (
      <motion.svg
        ref={scope} xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
        fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"
        className={`${className} cursor-pointer`} onHoverStart={start} onHoverEnd={stop}
      >
        <motion.g className="camera" style={{ transformOrigin: "12px 12px" }}>
          <path d="m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5" />
          <rect x="2" y="6" width="14" height="12" rx="2" />
        </motion.g>
      </motion.svg>
    );
  }
);
AnimatedVideoCameraIcon.displayName = "AnimatedVideoCameraIcon";

// 5. TrendingUpIcon
export const AnimatedTrendingUpIcon = forwardRef<AnimatedIconHandle, AnimatedIconProps>(
  ({ size = 24, color = "currentColor", strokeWidth = 2, className = "", isHovered }, ref) => {
    const [scope, animate] = useAnimate();
    const start = () => animate(".arrow", { x: [0, 3, 0], y: [0, -3, 0] }, { duration: 0.6 });
    const stop = () => animate(".arrow", { x: 0, y: 0 }, { duration: 0.3 });
    useImperativeHandle(ref, () => ({ startAnimation: start, stopAnimation: stop }));

    useEffect(() => {
      if (isHovered === true) start();
      else if (isHovered === false) stop();
    }, [isHovered]);

    return (
      <motion.svg
        ref={scope} xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
        fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"
        className={`${className} cursor-pointer`} onHoverStart={start} onHoverEnd={stop}
      >
        <motion.polyline points="22 7 13.5 15.5 8.5 10.5 2 17" className="arrow" />
        <motion.polyline points="16 7 22 7 22 13" className="arrow" />
      </motion.svg>
    );
  }
);
AnimatedTrendingUpIcon.displayName = "AnimatedTrendingUpIcon";

// 6. QuestionBankIcon
export const AnimatedQuestionBankIcon = forwardRef<AnimatedIconHandle, AnimatedIconProps>(
  ({ size = 24, color = "currentColor", strokeWidth = 2, className = "", isHovered }, ref) => {
    const [scope, animate] = useAnimate();
    const start = () => animate(".bookmark", { y: [0, -3, 0] }, { duration: 0.5 });
    const stop = () => animate(".bookmark", { y: 0 }, { duration: 0.3 });
    useImperativeHandle(ref, () => ({ startAnimation: start, stopAnimation: stop }));

    useEffect(() => {
      if (isHovered === true) start();
      else if (isHovered === false) stop();
    }, [isHovered]);

    return (
      <motion.svg
        ref={scope} xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
        fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"
        className={`${className} cursor-pointer`} onHoverStart={start} onHoverEnd={stop}
      >
        <motion.path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
        <motion.path d="M10 2v8l3-3 3 3V2" className="bookmark" />
      </motion.svg>
    );
  }
);
AnimatedQuestionBankIcon.displayName = "AnimatedQuestionBankIcon";

// 7. DashboardIcon (LayoutDashboard)
export const AnimatedDashboardIcon = forwardRef<AnimatedIconHandle, AnimatedIconProps>(
  ({ size = 24, color = "currentColor", strokeWidth = 2, className = "", isHovered }, ref) => {
    const [scope, animate] = useAnimate();
    const start = () => {
      const rects = Array.from(scope.current?.querySelectorAll(".dash-rect") ?? []);
      rects.forEach((rect: any, index) => {
        animate(rect, { scale: [1, 0.7, 1] }, { duration: 0.4, delay: index * 0.08 });
      });
    };
    const stop = () => animate(".dash-rect", { scale: 1 }, { duration: 0.2 });
    useImperativeHandle(ref, () => ({ startAnimation: start, stopAnimation: stop }));

    useEffect(() => {
      if (isHovered === true) start();
      else if (isHovered === false) stop();
    }, [isHovered]);

    return (
      <motion.svg
        ref={scope} xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
        fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"
        className={`${className} cursor-pointer`} onHoverStart={start} onHoverEnd={stop}
      >
        <rect width="7" height="9" x="3" y="3" rx="1" className="dash-rect" style={{ transformOrigin: "6.5px 7.5px" }} />
        <rect width="7" height="5" x="14" y="3" rx="1" className="dash-rect" style={{ transformOrigin: "17.5px 5.5px" }} />
        <rect width="7" height="9" x="14" y="12" rx="1" className="dash-rect" style={{ transformOrigin: "17.5px 16.5px" }} />
        <rect width="7" height="5" x="3" y="16" rx="1" className="dash-rect" style={{ transformOrigin: "6.5px 18.5px" }} />
      </motion.svg>
    );
  }
);
AnimatedDashboardIcon.displayName = "AnimatedDashboardIcon";

// 8. SettingsIcon
export const AnimatedSettingsIcon = forwardRef<AnimatedIconHandle, AnimatedIconProps>(
  ({ size = 24, color = "currentColor", strokeWidth = 2, className = "", isHovered }, ref) => {
    const [scope, animate] = useAnimate();
    // Rotate the entire SVG to ensure perfect center rotation and avoid group origin issues
    const start = () => animate(scope.current, { rotate: 90 }, { duration: 0.6, ease: "backOut" });
    const stop = () => animate(scope.current, { rotate: 0 }, { duration: 0.3 });
    useImperativeHandle(ref, () => ({ startAnimation: start, stopAnimation: stop }));

    useEffect(() => {
      if (isHovered === true) start();
      else if (isHovered === false) stop();
    }, [isHovered]);

    return (
      <motion.svg
        ref={scope} xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
        fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"
        className={`${className} cursor-pointer`} onHoverStart={start} onHoverEnd={stop}
      >
        <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
        <circle cx="12" cy="12" r="3" />
      </motion.svg>
    );
  }
);
AnimatedSettingsIcon.displayName = "AnimatedSettingsIcon";

// 9. TargetIcon (Practice)
export const AnimatedTargetIcon = forwardRef<AnimatedIconHandle, AnimatedIconProps>(
  ({ size = 24, color = "currentColor", strokeWidth = 2, className = "", isHovered }, ref) => {
    const [scope, animate] = useAnimate();
    const start = () => animate(".bullseye", { scale: [1, 1.4, 1] }, { duration: 0.5 });
    const stop = () => animate(".bullseye", { scale: 1 }, { duration: 0.3 });
    useImperativeHandle(ref, () => ({ startAnimation: start, stopAnimation: stop }));

    useEffect(() => {
      if (isHovered === true) start();
      else if (isHovered === false) stop();
    }, [isHovered]);

    return (
      <motion.svg
        ref={scope} xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
        fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"
        className={`${className} cursor-pointer`} onHoverStart={start} onHoverEnd={stop}
      >
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="12" r="6" />
        <circle cx="12" cy="12" r="2" className="bullseye" style={{ transformOrigin: "12px 12px" }} />
      </motion.svg>
    );
  }
);
AnimatedTargetIcon.displayName = "AnimatedTargetIcon";

// 10. ClapperboardIcon (Recordings)
export const AnimatedClapperboardIcon = forwardRef<AnimatedIconHandle, AnimatedIconProps>(
  ({ size = 24, color = "currentColor", strokeWidth = 2, className = "", isHovered }, ref) => {
    const [scope, animate] = useAnimate();
    const start = () => animate(".clapper", { rotate: [-10, 0] }, { duration: 0.4, ease: "easeOut" });
    const stop = () => animate(".clapper", { rotate: 0 }, { duration: 0.2 });
    useImperativeHandle(ref, () => ({ startAnimation: start, stopAnimation: stop }));

    useEffect(() => {
      if (isHovered === true) start();
      else if (isHovered === false) stop();
    }, [isHovered]);

    return (
      <motion.svg
        ref={scope} xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
        fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"
        className={`${className} cursor-pointer`} onHoverStart={start} onHoverEnd={stop}
      >
        <path d="M20.2 6 3 11l-.9-2.4c-.3-1.1.3-2.2 1.3-2.5l13.5-4c1.1-.3 2.2.3 2.5 1.3Z" className="clapper" style={{ transformOrigin: "3px 11px" }} />
        <path d="m6.2 5.3 3.1 3.9" className="clapper" style={{ transformOrigin: "3px 11px" }} />
        <path d="m12.4 3.4 3.1 4" className="clapper" style={{ transformOrigin: "3px 11px" }} />
        <path d="M3 11h18v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" />
      </motion.svg>
    );
  }
);
AnimatedClapperboardIcon.displayName = "AnimatedClapperboardIcon";

// 11. BellIcon
export const AnimatedBellIcon = forwardRef<AnimatedIconHandle, AnimatedIconProps>(
  ({ size = 24, color = "currentColor", strokeWidth = 2, className = "", isHovered }, ref) => {
    const [scope, animate] = useAnimate();
    const start = () => animate(".bell", { rotate: [0, 15, -15, 10, -10, 0] }, { duration: 0.6, ease: "easeInOut" });
    const stop = () => animate(".bell", { rotate: 0 }, { duration: 0.2 });
    useImperativeHandle(ref, () => ({ startAnimation: start, stopAnimation: stop }));

    useEffect(() => {
      if (isHovered === true) start();
      else if (isHovered === false) stop();
    }, [isHovered]);

    return (
      <motion.svg
        ref={scope} xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
        fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"
        className={`${className} cursor-pointer`} onHoverStart={start} onHoverEnd={stop}
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

// 12. LogoutIcon
export const AnimatedLogoutIcon = forwardRef<AnimatedIconHandle, AnimatedIconProps>(
  ({ size = 24, color = "currentColor", strokeWidth = 2, className = "", isHovered }, ref) => {
    const [scope, animate] = useAnimate();
    const start = () => animate(".arrow", { x: [0, 3, 0] }, { duration: 0.5, ease: "easeInOut" });
    const stop = () => animate(".arrow", { x: 0 }, { duration: 0.2 });
    useImperativeHandle(ref, () => ({ startAnimation: start, stopAnimation: stop }));

    useEffect(() => {
      if (isHovered === true) start();
      else if (isHovered === false) stop();
    }, [isHovered]);

    return (
      <motion.svg
        ref={scope} xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
        fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"
        className={`${className} cursor-pointer`} onHoverStart={start} onHoverEnd={stop}
      >
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
        <motion.g className="arrow">
          <polyline points="16 17 21 12 16 7" />
          <line x1="21" x2="9" y1="12" y2="12" />
        </motion.g>
      </motion.svg>
    );
  }
);
AnimatedLogoutIcon.displayName = "AnimatedLogoutIcon";

// 13. SearchIcon
export const AnimatedSearchIcon = forwardRef<AnimatedIconHandle, AnimatedIconProps>(
  ({ size = 24, color = "currentColor", strokeWidth = 2, className = "", isHovered }, ref) => {
    const [scope, animate] = useAnimate();
    const start = () => animate(".search-glass", { rotate: [0, 15, -10, 0] }, { duration: 0.5, ease: "easeInOut" });
    const stop = () => animate(".search-glass", { rotate: 0 }, { duration: 0.2 });
    useImperativeHandle(ref, () => ({ startAnimation: start, stopAnimation: stop }));

    useEffect(() => {
      if (isHovered === true) start();
      else if (isHovered === false) stop();
    }, [isHovered]);

    return (
      <motion.svg
        ref={scope} xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
        fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"
        className={`${className} cursor-pointer`} onHoverStart={start} onHoverEnd={stop}
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
