"use client";

import { IconMenu2, IconX } from "@tabler/icons-react";
import {
  AnimatePresence,
  motion,
  useMotionValueEvent,
  useScroll,
} from "motion/react";
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
        paddingTop: visible ? "0.45rem" : "var(--landing-nav-top)",
      }}
      transition={{
        type: "spring",
        stiffness: 240,
        damping: 30,
      }}
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
      animate={{
        backdropFilter: visible ? "blur(18px)" : "blur(12px)",
        borderRadius: visible ? 999 : 20,
        boxShadow: visible
          ? "0 16px 56px rgba(0, 0, 0, 0.32), 0 0 0 1px rgba(148, 163, 184, 0.08) inset"
          : "0 12px 40px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(148, 163, 184, 0.06) inset",
        width: visible ? "min(54rem, calc(100% - 2rem))" : "100%",
        height: visible
          ? "var(--landing-nav-height-scrolled)"
          : "var(--landing-nav-height)",
        y: visible ? 4 : 0,
      }}
      transition={{
        type: "spring",
        stiffness: 220,
        damping: 28,
      }}
      className={cn(
        "relative z-[60] mx-auto hidden h-[var(--landing-nav-height)] w-full max-w-[80rem] flex-row items-center justify-between border border-white/10 bg-[#020B21]/78 px-[clamp(1rem,2vw,1.25rem)] lg:flex",
        visible && "border-white/15 bg-[#071329]/90",
        className,
      )}
    >
      {children}
    </motion.div>
  );
};

export const NavItems = ({ items, className, onItemClick }: NavItemsProps) => {
  const [hovered, setHovered] = useState<number | null>(null);

  return (
    <motion.div
      onMouseLeave={() => setHovered(null)}
      className={cn(
        "absolute inset-0 hidden flex-1 flex-row items-center justify-center gap-1 text-sm font-medium lg:flex",
        className,
      )}
    >
      {items.map((item, idx) => (
        <a
          key={`link-${idx}`}
          href={item.link}
          onClick={onItemClick}
          onMouseEnter={() => setHovered(idx)}
          className="relative rounded-full px-4 py-2 text-[#8E97AB] transition-colors hover:text-[#F5F7FF]"
        >
          {hovered === idx && (
            <motion.div
              layoutId="landing-navbar-hovered"
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
              className="absolute inset-0 rounded-full bg-white/[0.08]"
            />
          )}
          <span className="relative z-20 whitespace-nowrap">{item.name}</span>
        </a>
      ))}
    </motion.div>
  );
};

export const MobileNav = ({ children, className, visible }: MobileNavProps) => {
  return (
    <motion.div
      animate={{
        backdropFilter: visible ? "blur(18px)" : "blur(12px)",
        borderRadius: visible ? 999 : 20,
        boxShadow: visible
          ? "0 16px 56px rgba(0, 0, 0, 0.32), 0 0 0 1px rgba(148, 163, 184, 0.08) inset"
          : "0 12px 40px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(148, 163, 184, 0.06) inset",
        width: visible ? "calc(100% - 2rem)" : "100%",
        height: visible
          ? "var(--landing-nav-height-scrolled)"
          : "var(--landing-nav-height)",
        y: visible ? 4 : 0,
      }}
      transition={{
        type: "spring",
        stiffness: 220,
        damping: 28,
      }}
      className={cn(
        "relative z-50 mx-auto flex h-[var(--landing-nav-height)] w-full max-w-[80rem] flex-col items-center justify-between border border-white/10 bg-[#020B21]/78 px-4 lg:hidden",
        visible && "border-white/15 bg-[#071329]/90",
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
            "absolute inset-x-0 top-[calc(100%+0.55rem)] z-50 flex w-full flex-col items-start justify-start gap-2 rounded-2xl border border-white/10 bg-[#071329]/95 p-3 shadow-[0_20px_70px_rgba(0,0,0,0.42)] backdrop-blur-xl",
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
      className="inline-flex size-10 items-center justify-center rounded-full text-[#F5F7FF] transition-colors hover:bg-white/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#67E8F9]"
    >
      {isOpen ? <IconX aria-hidden="true" size={20} /> : <IconMenu2 aria-hidden="true" size={20} />}
    </button>
  );
};

export const NavbarLogo = () => {
  return (
    <Link
      href="/"
      className="relative z-20 flex shrink-0 items-center gap-2"
    >
      <AppLogo size={28} className="rounded-md" priority />
      <span className="text-base font-semibold tracking-tight text-[#F5F7FF] sm:text-lg">
        Snap<span className="text-[#A5B4FC]">Interview</span>
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
      "bg-gradient-to-r from-[#2563EB] to-[#7C3AED] text-white shadow-[0_0_24px_rgba(99,102,241,0.35)] hover:shadow-[0_0_30px_rgba(103,232,249,0.22)]",
    secondary:
      "border border-white/15 bg-white/[0.05] text-[#F5F7FF] hover:bg-white/[0.1]",
  };

  return (
    <Tag
      {...(href ? { href } : {})}
      className={cn(
        "relative inline-flex h-9 items-center justify-center rounded-full px-4 text-sm font-semibold transition-[box-shadow,opacity,transform,background-color] duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#67E8F9]",
        variantStyles[variant],
        className,
      )}
    >
      {children}
    </Tag>
  );
};
