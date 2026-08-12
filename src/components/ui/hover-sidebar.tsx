"use client";

import { IconXMark } from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import React, {
  useState,
  createContext,
  useContext,
  useEffect,
  useCallback,
} from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import Link from "next/link";

interface SidebarContextProps {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  pinned: boolean;
  togglePinned: () => void;
  collapse: () => void;
  expand: () => void;
  mobileOpen: boolean;
  setMobileOpen: React.Dispatch<React.SetStateAction<boolean>>;
  animate: boolean;
  expanded: boolean;
}

const HoverSidebarContext = createContext<SidebarContextProps | undefined>(
  undefined,
);

const PINNED_KEY = "snap-sidebar-pinned";
/** Landing / auth motion language — soft settle */
const SIDEBAR_EASE = [0.22, 1, 0.36, 1] as const;
const WIDTH_COLLAPSED = 64;
const WIDTH_EXPANDED = 220;

export function useHoverSidebar() {
  const context = useContext(HoverSidebarContext);
  if (!context) {
    throw new Error("useHoverSidebar must be used within a HoverSidebarProvider");
  }
  return context;
}

export function HoverSidebarProvider({
  children,
  animate = true,
}: {
  children: React.ReactNode;
  animate?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.removeItem(PINNED_KEY);
    } catch {
      // ignore
    }
  }, []);

  const togglePinned = useCallback(() => {
    setPinned((prev) => {
      const next = !prev;
      setOpen(true);
      return next;
    });
  }, []);

  const collapse = useCallback(() => {
    setPinned(false);
    setOpen(false);
  }, []);

  const expand = useCallback(() => {
    setOpen(true);
  }, []);

  const expanded = open || pinned;

  return (
    <HoverSidebarContext.Provider
      value={{
        open,
        setOpen,
        pinned,
        togglePinned,
        collapse,
        expand,
        mobileOpen,
        setMobileOpen,
        animate,
        expanded,
      }}
    >
      {children}
    </HoverSidebarContext.Provider>
  );
}

export function HoverSidebar({
  children,
  animate,
}: {
  children: React.ReactNode;
  animate?: boolean;
}) {
  return (
    <HoverSidebarProvider animate={animate}>{children}</HoverSidebarProvider>
  );
}

export function HoverSidebarBody({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <>
      <DesktopHoverSidebar className={className}>{children}</DesktopHoverSidebar>
      <MobileHoverSidebar className={className}>{children}</MobileHoverSidebar>
    </>
  );
}

export function DesktopHoverSidebar({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  const { setOpen, pinned, animate, expanded } = useHoverSidebar();
  const reducedMotion = useReducedMotion() ?? false;

  return (
    <motion.aside
      className={cn(
        "relative hidden h-full shrink-0 flex-col overflow-hidden bg-[#0C0E14] md:flex",
        "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className,
      )}
      initial={false}
      animate={{
        width: animate ? (expanded ? WIDTH_EXPANDED : WIDTH_COLLAPSED) : WIDTH_EXPANDED,
      }}
      transition={
        reducedMotion || !animate
          ? { duration: 0 }
          : { duration: 0.52, ease: SIDEBAR_EASE }
      }
      onMouseEnter={() => {
        if (!pinned) setOpen(true);
      }}
      onMouseLeave={() => {
        if (!pinned) setOpen(false);
      }}
    >
      <div className="relative flex h-full flex-col p-0">{children}</div>
    </motion.aside>
  );
}

export function MobileHoverSidebar({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  const { mobileOpen, setMobileOpen } = useHoverSidebar();
  const reducedMotion = useReducedMotion() ?? false;

  return (
    <AnimatePresence>
      {mobileOpen ? (
        <motion.div
          initial={reducedMotion ? false : { x: "-100%", opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={reducedMotion ? undefined : { x: "-100%", opacity: 0 }}
          transition={
            reducedMotion
              ? { duration: 0 }
              : { duration: 0.45, ease: SIDEBAR_EASE }
          }
          className={cn(
            "fixed inset-0 z-[100] flex h-full w-full flex-col overflow-y-auto bg-[#090A0F] p-6 md:hidden",
            "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
            className,
          )}
        >
          <div
            className="pointer-events-none absolute inset-0"
            aria-hidden="true"
            style={{
              background:
                "radial-gradient(ellipse 70% 40% at 20% 0%, rgba(37,99,235,0.14) 0%, transparent 50%)",
            }}
          />
          <button
            type="button"
            className="relative z-50 mb-4 ml-auto grid h-9 w-9 cursor-pointer place-items-center rounded-lg text-[#B4C0D0] transition-colors hover:bg-white/[0.06] hover:text-[#CBD5E1]"
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
          >
            <IconXMark className="h-5 w-5" />
          </button>
          <div className="relative flex min-h-0 flex-1 flex-col">{children}</div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

/** Soft label reveal — opacity settle instead of display pop */
export function SidebarLabel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const { expanded } = useHoverSidebar();
  const reducedMotion = useReducedMotion() ?? false;

  if (!expanded) return null;

  return (
    <motion.span
      initial={{ opacity: 0, x: -4 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -4 }}
      transition={
        reducedMotion
          ? { duration: 0 }
          : {
              duration: 0.22,
              ease: SIDEBAR_EASE,
            }
      }
      className={cn("whitespace-nowrap text-sm", className)}
    >
      {children}
    </motion.span>
  );
}

export function HoverSidebarLink({
  link,
  className,
  onClick,
  active,
}: {
  link: {
    label: string;
    href: string;
    icon: React.JSX.Element | React.ReactNode;
  };
  className?: string;
  onClick?: () => void;
  active?: boolean;
}) {
  const { expanded } = useHoverSidebar();

  return (
    <Link
      href={link.href}
      onClick={onClick}
      className={cn(
        "group/sidebar relative flex h-9 cursor-pointer items-center rounded-lg text-xs font-medium outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-400/45",
        expanded ? "px-2.5 gap-3" : "w-9 h-9 justify-center mx-auto",
        active
          ? "bg-white/[0.08] text-white"
          : "text-[#9EA8B6] hover:bg-white/[0.04] hover:text-[#F2F4F8]",
        className,
      )}
    >
      <span className="flex h-5 w-5 shrink-0 items-center justify-center text-current [&_svg]:block [&_svg]:text-current">
        {link.icon}
      </span>
      <SidebarLabel>{link.label}</SidebarLabel>

      {!expanded ? (
        <div className="pointer-events-none absolute left-full ml-3 hidden rounded-md border border-white/[0.12] bg-[#161822] px-2.5 py-1 text-xs font-medium text-white shadow-xl group-hover/sidebar:block z-50 whitespace-nowrap">
          {link.label}
        </div>
      ) : null}
    </Link>
  );
}
