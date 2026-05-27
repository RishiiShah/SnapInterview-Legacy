"use client";

import { forwardRef, useEffect, useImperativeHandle } from "react";
import { motion, useAnimate, stagger } from "framer-motion";
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

function useHoverAnimation(isHovered: boolean | undefined, start: () => void, stop: () => void) {
  useEffect(() => {
    if (isHovered === true) start();
    else if (isHovered === false) stop();
  }, [isHovered, start, stop]);
}

// Landing / Sparkles
export const AnimatedSparklesIcon = forwardRef<AnimatedIconHandle, AnimatedIconProps>(
  ({ size = 24, color = "currentColor", strokeWidth = 2, className = "", isHovered }, ref) => {
    const [scope, animate] = useAnimate();
    const start = () => animate(".sparkle", { scale: [1, 1.2, 1], rotate: [0, 16, 0] }, { duration: 0.6, ease: "easeInOut" });
    const stop = () => animate(".sparkle", { scale: 1, rotate: 0 }, { duration: 0.2 });
    useImperativeHandle(ref, () => ({ startAnimation: start, stopAnimation: stop }));
    useHoverAnimation(isHovered, start, stop);

    return (
      <motion.svg
        ref={scope} xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
        fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"
        className={`${className} cursor-pointer`} onHoverStart={start} onHoverEnd={stop}
      >
        <motion.path
          className="sparkle"
          d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"
          style={{ transformOrigin: "12px 12px" }}
        />
      </motion.svg>
    );
  }
);
AnimatedSparklesIcon.displayName = "AnimatedSparklesIcon";

// Landing / ChartBars
export const AnimatedChartBarsIcon = forwardRef<AnimatedIconHandle, AnimatedIconProps>(
  ({ size = 24, color = "currentColor", strokeWidth = 2, className = "", isHovered }, ref) => {
    const [scope, animate] = useAnimate();
    const start = () => animate(".bar", { y: [0, -4, 0] }, { duration: 0.6, delay: stagger(0.08) });
    const stop = () => animate(".bar", { y: 0 }, { duration: 0.2 });
    useImperativeHandle(ref, () => ({ startAnimation: start, stopAnimation: stop }));
    useHoverAnimation(isHovered, start, stop);

    return (
      <motion.svg
        ref={scope} xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
        fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"
        className={`${className} cursor-pointer`} onHoverStart={start} onHoverEnd={stop}
      >
        <path d="M3 3v18h18" />
        <motion.path d="M8 17v-3" className="bar" />
        <motion.path d="M13 17V5" className="bar" />
        <motion.path d="M18 17V9" className="bar" />
      </motion.svg>
    );
  }
);
AnimatedChartBarsIcon.displayName = "AnimatedChartBarsIcon";

// Landing / Clock
export const AnimatedClockIcon = forwardRef<AnimatedIconHandle, AnimatedIconProps>(
  ({ size = 24, color = "currentColor", strokeWidth = 2, className = "", isHovered }, ref) => {
    const [scope, animate] = useAnimate();
    const start = () => animate(".clock-hands", { rotate: 360 }, { duration: 1, ease: "easeInOut" });
    const stop = () => animate(".clock-hands", { rotate: 0 }, { duration: 0.3 });
    useImperativeHandle(ref, () => ({ startAnimation: start, stopAnimation: stop }));
    useHoverAnimation(isHovered, start, stop);

    return (
      <motion.svg
        ref={scope} xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
        fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"
        className={`${className} cursor-pointer`} onHoverStart={start} onHoverEnd={stop}
      >
        <circle cx="12" cy="12" r="10" />
        <motion.path d="M12 6v6l4 2" className="clock-hands" style={{ transformOrigin: "12px 12px" }} />
      </motion.svg>
    );
  }
);
AnimatedClockIcon.displayName = "AnimatedClockIcon";

// Landing / QuestionBank
export const AnimatedQuestionBankIcon = forwardRef<AnimatedIconHandle, AnimatedIconProps>(
  ({ size = 24, color = "currentColor", strokeWidth = 2, className = "", isHovered }, ref) => {
    const [scope, animate] = useAnimate();
    const start = () => animate(".bookmark", { y: [0, -3, 0] }, { duration: 0.5, ease: "easeInOut" });
    const stop = () => animate(".bookmark", { y: 0 }, { duration: 0.2 });
    useImperativeHandle(ref, () => ({ startAnimation: start, stopAnimation: stop }));
    useHoverAnimation(isHovered, start, stop);

    return (
      <motion.svg
        ref={scope} xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
        fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"
        className={`${className} cursor-pointer`} onHoverStart={start} onHoverEnd={stop}
      >
        <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
        <motion.path d="M10 2v8l3-3 3 3V2" className="bookmark" />
      </motion.svg>
    );
  }
);
AnimatedQuestionBankIcon.displayName = "AnimatedQuestionBankIcon";

// 1. Dashboard / LayoutDashboard
export const AnimatedDashboardIcon = forwardRef<AnimatedIconHandle, AnimatedIconProps>(
  ({ size = 24, color = "currentColor", strokeWidth = 2, className = "", isHovered }, ref) => {
    const [scope, animate] = useAnimate();

    const start = () => {
      animate(".rect-1", { x: 10 }, { duration: 0.3, ease: "easeInOut" });
      animate(".rect-2", { y: 12, x: -1 }, { duration: 0.3, ease: "easeInOut" });
      animate(".rect-3", { x: -10 }, { duration: 0.3, ease: "easeInOut" });
      animate(".rect-4", { y: -12, x: 1 }, { duration: 0.3, ease: "easeInOut" });
    };

    const stop = () => {
      animate(".rect-1, .rect-2, .rect-3, .rect-4", { scale: 1, x: 0, y: 0 }, { duration: 0.2, ease: "easeInOut" });
    };

    useImperativeHandle(ref, () => ({ startAnimation: start, stopAnimation: stop }));

    useHoverAnimation(isHovered, start, stop);

    return (
      <motion.svg
        ref={scope} xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
        fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"
        className={`${className} cursor-pointer`} onHoverStart={start} onHoverEnd={stop}
      >
        <motion.rect className="rect-1" width="7" height="9" x="3" y="3" rx="1" />
        <motion.rect className="rect-2" width="7" height="5" x="14" y="3" rx="1" />
        <motion.rect className="rect-3" width="7" height="9" x="14" y="12" rx="1" />
        <motion.rect className="rect-4" width="7" height="5" x="3" y="16" rx="1" />
      </motion.svg>
    );
  }
);
AnimatedDashboardIcon.displayName = "AnimatedDashboardIcon";
export const AnimatedHomeIcon = AnimatedDashboardIcon;

// 2. Practice / MessageSquare (Mock Interview)
export const AnimatedMessageSquareIcon = forwardRef<AnimatedIconHandle, AnimatedIconProps>(
  ({ size = 24, color = "currentColor", strokeWidth = 2, className = "", isHovered }, ref) => {
    const [scope, animate] = useAnimate();

    const start = () => {
      animate(".bubble", { y: -1, scale: 1.03 }, { duration: 0.24, ease: "easeOut" });
      animate(
        ".dot",
        { y: [0.6, -0.9, 0], scale: [0.92, 1.08, 1], opacity: [0.45, 1, 0.75] },
        { duration: 0.42, delay: stagger(0.08), ease: "easeInOut" },
      );
    };

    const stop = () => {
      animate(".bubble", { y: 0, scale: 1 }, { duration: 0.18, ease: "easeInOut" });
      animate(".dot", { y: 0, scale: 1, opacity: 0.7 }, { duration: 0.18, ease: "easeInOut" });
    };

    useImperativeHandle(ref, () => ({ startAnimation: start, stopAnimation: stop }));

    useHoverAnimation(isHovered, start, stop);

    return (
      <motion.svg
        ref={scope} xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
        fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"
        className={`${className} cursor-pointer`} onHoverStart={start} onHoverEnd={stop}
      >
        <motion.path
          className="bubble"
          d="M19 4H5a2 2 0 0 0-2 2v14l4-3h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2Z"
          style={{ transformOrigin: "12px 12px" }}
        />
        <motion.circle cx="9" cy="10.5" r="1" fill={color} stroke="none" className="dot dot-1" opacity={0.7} />
        <motion.circle cx="12" cy="10.5" r="1" fill={color} stroke="none" className="dot dot-2" opacity={0.7} />
        <motion.circle cx="15" cy="10.5" r="1" fill={color} stroke="none" className="dot dot-3" opacity={0.7} />
      </motion.svg>
    );
  }
);
AnimatedMessageSquareIcon.displayName = "AnimatedMessageSquareIcon";

// 3. Question Bank / Library
export const AnimatedLibraryIcon = forwardRef<AnimatedIconHandle, AnimatedIconProps>(
  ({ size = 24, color = "currentColor", strokeWidth = 2, className = "", isHovered }, ref) => {
    const [scope, animate] = useAnimate();

    const start = () => {
      animate(".book-2", { y: -2.5 }, { duration: 0.26, ease: [0.22, 1, 0.36, 1] });
      animate(".book-1", { rotate: 8 }, { duration: 0.26, ease: [0.22, 1, 0.36, 1] });
    };

    const stop = () => {
      animate(".book-2", { y: 0 }, { duration: 0.2, ease: "easeInOut" });
      animate(".book-1", { rotate: 0 }, { duration: 0.2, ease: "easeInOut" });
    };

    useImperativeHandle(ref, () => ({ startAnimation: start, stopAnimation: stop }));

    useHoverAnimation(isHovered, start, stop);

    return (
      <motion.svg
        ref={scope} xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
        fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"
        className={`${className} cursor-pointer`} onHoverStart={start} onHoverEnd={stop}
        style={{ overflow: "visible" }}
      >
        <motion.path className="book-1" d="m16 6 4 14" style={{ transformOrigin: "18px 20px" }} />
        <motion.path className="book-2" d="M12 6v14" style={{ transformOrigin: "12px 20px" }} />
        <path d="M8 8v12" />
        <path d="M4 4v16" />
      </motion.svg>
    );
  }
);
AnimatedLibraryIcon.displayName = "AnimatedLibraryIcon";

// 4. Analytics / ChartLine
export const AnimatedChartLineIcon = forwardRef<AnimatedIconHandle, AnimatedIconProps>(
  ({ size = 24, color = "currentColor", strokeWidth = 2, className = "", isHovered }, ref) => {
    const [scope, animate] = useAnimate();
    
    const start = () => {
      animate(".chart-line", { pathLength: [0, 1] }, { duration: 0.6, ease: "easeInOut" });
      animate(".base-line", { scaleX: [0, 1] }, { duration: 0.4, ease: "easeOut" });
    };

    const stop = () => {
      animate(".chart-line", { pathLength: 1 }, { duration: 0.2, ease: "easeInOut" });
      animate(".base-line", { scaleX: 1 }, { duration: 0.2, ease: "easeInOut" });
    };

    useImperativeHandle(ref, () => ({ startAnimation: start, stopAnimation: stop }));

    useHoverAnimation(isHovered, start, stop);

    return (
      <motion.svg
        ref={scope} xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
        fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"
        className={`${className} cursor-pointer`} onHoverStart={start} onHoverEnd={stop}
      >
        <path stroke="none" d="M0 0h24v24H0z" fill="none" />
        <motion.path
          d="M4 19l16 0"
          className="base-line"
          style={{ transformOrigin: "4px 19px" }}
        />
        <motion.path
          d="M4 15l4 -6l4 2l4 -5l4 4"
          className="chart-line"
          initial={{ pathLength: 1 }}
        />
      </motion.svg>
    );
  }
);
AnimatedChartLineIcon.displayName = "AnimatedChartLineIcon";
export const AnimatedTrendingUpIcon = AnimatedChartLineIcon;

// 5. Recordings / VideoCamera (Red dot pulse)
export const AnimatedVideoCameraIcon = forwardRef<AnimatedIconHandle, AnimatedIconProps>(
  ({ size = 24, color = "currentColor", strokeWidth = 2, className = "", isHovered }, ref) => {
    const [scope, animate] = useAnimate();
    const start = () => {
      animate(".camera-body", { scale: [1, 0.95, 1.02, 1] }, { duration: 0.5 });
      animate(".rec-dot", { opacity: [0, 1, 0, 1, 0] }, { duration: 1.5, ease: "linear" });
    };
    const stop = () => {
      animate(".camera-body", { scale: 1 }, { duration: 0.2 });
      animate(".rec-dot", { opacity: 0 }, { duration: 0.2 });
    };
    useImperativeHandle(ref, () => ({ startAnimation: start, stopAnimation: stop }));

    useHoverAnimation(isHovered, start, stop);

    return (
      <motion.svg
        ref={scope} xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
        fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"
        className={`${className} cursor-pointer`} onHoverStart={start} onHoverEnd={stop}
      >
        <motion.g className="camera-body" style={{ transformOrigin: "12px 12px" }}>
          <path d="m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5" />
          <rect x="2" y="6" width="14" height="12" rx="2" />
        </motion.g>
        <motion.circle cx="5" cy="9" r="1.5" fill="#ef4444" stroke="none" className="rec-dot" opacity={0} />
      </motion.svg>
    );
  }
);
AnimatedVideoCameraIcon.displayName = "AnimatedVideoCameraIcon";

// 6. SettingsIcon
export const AnimatedSettingsIcon = forwardRef<AnimatedIconHandle, AnimatedIconProps>(
  ({ size = 24, color = "currentColor", strokeWidth = 2, className = "", isHovered }, ref) => {
    const [scope, animate] = useAnimate();
    const start = () => animate(scope.current, { rotate: [0, 90] }, { duration: 0.6, type: "spring", bounce: 0.3 });
    const stop = () => animate(scope.current, { rotate: 0 }, { duration: 0.4, type: "spring", bounce: 0 });
    useImperativeHandle(ref, () => ({ startAnimation: start, stopAnimation: stop }));

    useHoverAnimation(isHovered, start, stop);

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

// 7. LogoutIcon
export const AnimatedLogoutIcon = forwardRef<AnimatedIconHandle, AnimatedIconProps>(
  ({ size = 24, color = "currentColor", strokeWidth = 2, className = "", isHovered }, ref) => {
    const [scope, animate] = useAnimate();
    const start = () => animate(".arrow", { x: [0, 4, 0] }, { duration: 0.6, ease: "easeInOut" });
    const stop = () => animate(".arrow", { x: 0 }, { duration: 0.2 });
    useImperativeHandle(ref, () => ({ startAnimation: start, stopAnimation: stop }));

    useHoverAnimation(isHovered, start, stop);

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

// 8. BellIcon
export const AnimatedBellIcon = forwardRef<AnimatedIconHandle, AnimatedIconProps>(
  ({ size = 24, color = "currentColor", strokeWidth = 2, className = "", isHovered }, ref) => {
    const [scope, animate] = useAnimate();
    const start = () => animate(".bell", { rotate: [0, 15, -15, 10, -10, 0] }, { duration: 0.6, ease: "easeInOut" });
    const stop = () => animate(".bell", { rotate: 0 }, { duration: 0.2 });
    useImperativeHandle(ref, () => ({ startAnimation: start, stopAnimation: stop }));

    useHoverAnimation(isHovered, start, stop);

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

// 9. SearchIcon
export const AnimatedSearchIcon = forwardRef<AnimatedIconHandle, AnimatedIconProps>(
  ({ size = 24, color = "currentColor", strokeWidth = 2, className = "", isHovered }, ref) => {
    const [scope, animate] = useAnimate();
    const start = () => animate(".search-glass", { rotate: [0, 15, -10, 0] }, { duration: 0.6, ease: "easeInOut" });
    const stop = () => animate(".search-glass", { rotate: 0 }, { duration: 0.2 });
    useImperativeHandle(ref, () => ({ startAnimation: start, stopAnimation: stop }));

    useHoverAnimation(isHovered, start, stop);

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
