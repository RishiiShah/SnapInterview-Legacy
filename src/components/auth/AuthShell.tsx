"use client";

import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { motion, useReducedMotion, AnimatePresence } from "framer-motion";
import { AppLogo } from "@/components/ui/AppLogo";

const AUTH_BG = "/hero-starry-bg.jpg";
export const AUTH_EASE = [0.16, 1, 0.3, 1] as const;

/**
 * Auth layout: same sharp hero photograph + vignettes as the landing,
 * with a quiet centered form column (no glass-card chrome).
 */
export function AuthShell({
  children,
  footer,
  contentClassName,
}: {
  children: ReactNode;
  footer?: ReactNode;
  /** Override the default narrow auth column (e.g. onboarding). */
  contentClassName?: string;
}) {
  const reducedMotion = useReducedMotion() ?? false;

  return (
    <div className="auth-shell relative flex h-dvh max-h-dvh overflow-hidden bg-[#090A0F] font-sans text-[#F5F7FF] selection:bg-blue-600 selection:text-white">
      <div className="pointer-events-none absolute inset-0 z-0">
        <Image
          src={AUTH_BG}
          alt=""
          fill
          priority
          quality={100}
          sizes="100vw"
          className="object-cover object-center"
          aria-hidden="true"
        />

        {/* Match landing hero overlays — readable without blurring the photo */}
        <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-[#090A0F]/80 via-[#090A0F]/30 to-transparent" />
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 70% 65% at 50% 45%, rgba(9,10,15,0.55) 0%, rgba(9,10,15,0.82) 72%, rgba(9,10,15,0.94) 100%)",
          }}
        />
        <div
          className="absolute inset-x-0 bottom-0 h-56"
          style={{
            background:
              "linear-gradient(to top, #090A0F 0%, rgba(9,10,15,0.9) 35%, transparent 100%)",
          }}
        />
      </div>

      {/* Brand — same mark treatment as landing nav */}
      <div className="absolute left-0 right-0 top-0 z-20 px-4 pt-[var(--landing-nav-top,1.25rem)] sm:px-6 lg:px-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 transition-opacity hover:opacity-90"
        >
          <AppLogo size={28} className="rounded-md" priority />
          <span className="text-sm font-semibold tracking-tight text-[#F5F7FF] sm:text-base">
            Snap<span className="text-blue-400">Interview</span>
          </span>
        </Link>
      </div>

      <div className="relative z-10 flex h-full min-h-0 w-full items-center justify-center overflow-y-auto overscroll-contain px-4 pt-16 pb-6 sm:px-6 sm:pb-8">
        <motion.div
          initial={reducedMotion ? false : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={
            reducedMotion ? { duration: 0 } : { duration: 0.92, ease: AUTH_EASE }
          }
          className={contentClassName ?? "my-auto w-full max-w-[22rem]"}
        >
          {children}

          {footer ? (
            <div className="mt-6 w-full border-t border-white/[0.08] pt-5 text-center text-sm text-[#CBD5E1] sm:text-[0.95rem]">
              {footer}
            </div>
          ) : null}
        </motion.div>
      </div>
    </div>
  );
}

/** Stagger container for auth form fields */
export function AuthFormStagger({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const reducedMotion = useReducedMotion() ?? false;

  return (
    <motion.div
      initial={reducedMotion ? false : "hidden"}
      animate="visible"
      variants={{
        hidden: {},
        visible: {
          transition: {
            staggerChildren: reducedMotion ? 0 : 0.12,
            delayChildren: reducedMotion ? 0 : 0.07,
          },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/** Stagger item for auth form fields */
export function AuthFormStaggerItem({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const reducedMotion = useReducedMotion() ?? false;

  return (
    <motion.div
      variants={{
        hidden: reducedMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 },
        visible: {
          opacity: 1,
          y: 0,
          transition: reducedMotion
            ? { duration: 0 }
            : { duration: 0.75, ease: AUTH_EASE },
        },
      }}
      className={className}
      style={{ willChange: reducedMotion ? "auto" : "transform, opacity" }}
    >
      {children}
    </motion.div>
  );
}

export function AuthHeader({
  title,
  description,
  align = "left",
}: {
  title: string;
  description?: string;
  align?: "left" | "center";
}) {
  return (
    <div className={`mb-5 ${align === "center" ? "text-center" : ""}`}>
      <h1 className="text-[clamp(1.55rem,3.5vw,1.95rem)] font-bold leading-[1.1] tracking-[-0.035em] text-white">
        {title}
      </h1>
      {description ? (
        <p className="mt-2 text-sm leading-relaxed text-[#CBD5E1] sm:text-[0.95rem]">
          {description}
        </p>
      ) : null}
    </div>
  );
}

export function AuthError({ message }: { message: string }) {
  const reducedMotion = useReducedMotion() ?? false;

  return (
    <AnimatePresence>
      {message ? (
        <motion.div
          role="alert"
          initial={reducedMotion ? false : { opacity: 0, y: -6, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -6, scale: 0.98 }}
          transition={
            reducedMotion ? { duration: 0 } : { duration: 0.25, ease: AUTH_EASE }
          }
          className="rounded-xl border border-red-500/20 bg-red-500/[0.08] px-4 py-3 text-sm text-red-400"
        >
          {message}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

export function AuthDivider({ label = "or" }: { label?: string }) {
  return (
    <div className="my-5 flex items-center gap-3">
      <span className="h-px flex-1 bg-white/[0.08]" />
      <span className="text-[0.7rem] font-medium uppercase tracking-wider text-[#B8C0CE]">
        {label}
      </span>
      <span className="h-px flex-1 bg-white/[0.08]" />
    </div>
  );
}

const FIELD_CLASS =
  "w-full rounded-xl border border-white/[0.08] bg-[#0C0F1A]/80 px-3.5 py-3 text-[15px] text-white outline-none placeholder:text-[#B8C0CE] transition-all duration-200 focus:border-blue-500/45 focus:ring-2 focus:ring-blue-500/15 sm:text-base";

export function AuthTextField({
  id,
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  autoComplete = "off",
  error,
}: {
  id: string;
  label: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoComplete?: string;
  error?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-[#CBD5E1]">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className={`${FIELD_CLASS} ${error ? "border-red-500/50 focus:border-red-500 focus:ring-red-500/20" : ""}`}
      />
      {error ? (
        <p className="mt-1 text-xs font-medium text-red-400">{error}</p>
      ) : null}
    </div>
  );
}

export { FIELD_CLASS as authFieldClassName };
