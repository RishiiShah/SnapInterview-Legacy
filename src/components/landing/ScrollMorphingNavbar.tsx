"use client";

import { IconMenu2, IconX } from "@tabler/icons-react";
import {
  AnimatePresence,
  motion,
  useMotionValueEvent,
  useScroll,
} from "framer-motion";
import Link from "next/link";
import React, { useState } from "react";
import { AppLogo } from "@/components/ui/AppLogo";
import { cn } from "@/lib/utils";

interface NavbarProps {
  children: React.ReactNode;
  className?: string;
}

interface NavBodyProps {
  children: React.ReactNode;
  className?: string;
  visible?: boolean;
}

interface NavItemsProps {
  items: {
    name: string;
    link: string;
  }[];
  activeLink?: string | null;
  className?: string;
  onItemClick?: () => void;
}

interface MobileNavProps {
  children: React.ReactNode;
  className?: string;
  visible?: boolean;
}

interface MobileNavHeaderProps {
  children: React.ReactNode;
  className?: string;
}

interface MobileNavMenuProps {
  children: React.ReactNode;
  className?: string;
  isOpen: boolean;
  onClose: () => void;
}

const NAV_MORPH = {
  duration: 0.79,
  ease: [0.16, 1, 0.3, 1] as const,
};

export const Navbar = ({ children, className }: NavbarProps) => {
  const { scrollY } = useScroll();
  const [visible, setVisible] = useState(false);

  useMotionValueEvent(scrollY, "change", (latest) => {
    setVisible(latest > 48);
  });

  return (
    <motion.div
      className={cn(
        "fixed inset-x-0 top-0 z-50 px-[var(--landing-gutter)]",
        className,
      )}
      animate={{
        paddingTop: visible ? "0.35rem" : "var(--landing-nav-top)",
      }}
      transition={NAV_MORPH}
      data-nav-visible={visible ? "true" : "false"}
    >
      {React.Children.map(children, (child) =>
        React.isValidElement(child)
          ? React.cloneElement(
              child as React.ReactElement<{ visible?: boolean }>,
              { visible },
            )
          : child,
      )}
    </motion.div>
  );
};

export const NavBody = ({ children, className, visible }: NavBodyProps) => {
  return (
    <motion.div
      initial={false}
      animate={{
        backdropFilter: visible ? "blur(18px)" : "blur(12px)",
        borderRadius: visible ? 999 : 20,
        boxShadow: visible
          ? "0 12px 40px rgba(0, 0, 0, 0.28), 0 0 0 1px rgba(148, 163, 184, 0.08) inset"
          : "0 12px 40px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(148, 163, 184, 0.06) inset",
        width: visible ? "min(48rem, calc(100% - 2.5rem))" : "100%",
        height: visible
          ? "var(--landing-nav-height-scrolled)"
          : "var(--landing-nav-height)",
        paddingLeft: visible ? 8 : 12,
        paddingRight: visible ? 8 : 12,
        backgroundColor: visible
          ? "rgba(9, 10, 15, 0.92)"
          : "rgba(9, 10, 15, 0.6)",
        borderColor: visible
          ? "rgba(255, 255, 255, 0.15)"
          : "rgba(255, 255, 255, 0.1)",
        y: visible ? 2 : 0,
      }}
      transition={NAV_MORPH}
      className={cn(
        "relative z-[60] mx-auto hidden h-[var(--landing-nav-height)] w-full max-w-[80rem] flex-row items-center justify-between border border-white/10 bg-[#090A0F]/60 px-3 shadow-[0_12px_40px_rgba(0,0,0,0.2)] outline-none lg:flex",
        className,
      )}
    >
      {children}
    </motion.div>
  );
};

export const NavItems = ({
  items,
  activeLink,
  className,
  onItemClick,
}: NavItemsProps) => {
  const [hovered, setHovered] = useState<number | null>(null);

  return (
    <motion.div
      onMouseLeave={() => setHovered(null)}
      className={cn(
        "absolute inset-0 hidden flex-1 flex-row items-center justify-center gap-0.5 text-sm font-medium lg:flex",
        className,
      )}
    >
      {items.map((item, idx) => {
        const isActive = activeLink === item.link;
        return (
          <a
            key={`link-${idx}`}
            href={item.link}
            onClick={onItemClick}
            onMouseEnter={() => setHovered(idx)}
            aria-current={isActive ? "true" : undefined}
            className={cn(
              "relative rounded-full px-2.5 py-1.5 text-sm text-[#B4BCCE] transition-colors hover:text-[#F5F7FF]",
              isActive && "text-[#F5F7FF]",
            )}
          >
            {(hovered === idx || isActive) && (
              <motion.div
                layoutId="landing-navbar-hovered"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
                className={cn(
                  "absolute inset-0 rounded-full",
                  isActive && hovered !== idx
                    ? "bg-white/[0.06]"
                    : "bg-white/[0.08]",
                )}
              />
            )}
            <span className="relative z-20 whitespace-nowrap">{item.name}</span>
          </a>
        );
      })}
    </motion.div>
  );
};

export const MobileNav = ({ children, className, visible }: MobileNavProps) => {
  return (
    <motion.div
      initial={false}
      animate={{
        backdropFilter: visible ? "blur(18px)" : "blur(12px)",
        borderRadius: visible ? 999 : 20,
        boxShadow: visible
          ? "0 12px 40px rgba(0, 0, 0, 0.28), 0 0 0 1px rgba(148, 163, 184, 0.08) inset"
          : "0 12px 40px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(148, 163, 184, 0.06) inset",
        width: visible ? "calc(100% - 2.5rem)" : "100%",
        height: visible
          ? "var(--landing-nav-height-scrolled)"
          : "var(--landing-nav-height)",
        paddingLeft: visible ? 10 : 12,
        paddingRight: visible ? 10 : 12,
        backgroundColor: visible
          ? "rgba(9, 10, 15, 0.92)"
          : "rgba(9, 10, 15, 0.6)",
        borderColor: visible
          ? "rgba(255, 255, 255, 0.15)"
          : "rgba(255, 255, 255, 0.1)",
        y: visible ? 2 : 0,
      }}
      transition={NAV_MORPH}
      className={cn(
        "relative z-50 mx-auto flex h-[var(--landing-nav-height)] w-full max-w-[80rem] flex-col items-center justify-between border border-white/10 bg-[#090A0F]/60 px-3 shadow-[0_12px_40px_rgba(0,0,0,0.2)] outline-none lg:hidden",
        className,
      )}
    >
      {children}
    </motion.div>
  );
};

export const MobileNavHeader = ({
  children,
  className,
}: MobileNavHeaderProps) => {
  return (
    <div
      className={cn(
        "flex h-full w-full flex-row items-center justify-between",
        className,
      )}
    >
      {children}
    </div>
  );
};

export const MobileNavMenu = ({
  children,
  className,
  isOpen,
  onClose,
}: MobileNavMenuProps) => {
  return (
    <AnimatePresence initial={false}>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: -8, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.98 }}
          className={cn(
            "absolute inset-x-0 top-[calc(100%+0.55rem)] z-50 flex w-full flex-col items-start justify-start gap-1 rounded-2xl border border-white/10 bg-[#071329]/95 p-3 shadow-[0_20px_70px_rgba(0,0,0,0.42)] backdrop-blur-xl",
            className,
          )}
          onClick={(event) => {
            if (event.target === event.currentTarget) onClose();
          }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export const MobileNavToggle = ({
  isOpen,
  onClick,
}: {
  isOpen: boolean;
  onClick: () => void;
}) => {
  return (
    <button
      type="button"
      aria-expanded={isOpen}
      aria-label={isOpen ? "Close navigation menu" : "Open navigation menu"}
      onClick={onClick}
      className="inline-flex size-9 items-center justify-center rounded-full text-[#F5F7FF] transition-colors hover:bg-white/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#67E8F9] cursor-pointer"
    >
      {isOpen ? <IconX aria-hidden="true" size={20} /> : <IconMenu2 aria-hidden="true" size={20} />}
    </button>
  );
};

export const NavbarLogo = () => {
  const scrollHome = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (window.location.pathname !== "/") return;

    event.preventDefault();
    if (window.location.hash) {
      history.replaceState(null, "", "/");
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <Link
      href="/"
      onClick={scrollHome}
      className="relative z-20 flex shrink-0 items-center gap-2"
    >
      <AppLogo size={28} className="rounded-md" priority />
      <span className="text-sm font-semibold tracking-tight text-[#F5F7FF] sm:text-base">
        Snap<span className="text-blue-400">Interview</span>
      </span>
    </Link>
  );
};

export const NavbarButton = ({
  href,
  as: Tag = "a",
  children,
  className,
  variant = "primary",
}: {
  href?: string;
  as?: React.ElementType;
  children: React.ReactNode;
  className?: string;
  variant?: "primary" | "secondary";
}) => {
  const variantStyles = {
    primary:
      "bg-blue-600 text-white hover:bg-blue-500",
    secondary:
      "border border-white/15 bg-white/[0.05] text-[#F5F7FF] hover:bg-white/[0.1]",
  };

  return (
    <Tag
      {...(href ? { href } : {})}
      className={cn(
        "relative inline-flex h-8 items-center justify-center rounded-full px-3.5 text-sm font-semibold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#67E8F9] cursor-pointer",
        variantStyles[variant],
        className,
      )}
    >
      {children}
    </Tag>
  );
};
