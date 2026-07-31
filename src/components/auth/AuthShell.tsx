"use client";

import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { AppLogo } from "@/components/ui/AppLogo";

const AUTH_BG = "/hero-starry-bg.jpg";
const AUTH_EASE = [0.45, 0.05, 0.55, 0.95] as const;

/**
 * Auth layout: same sharp hero photograph + vignettes as the landing,
 * with a quiet centered form column (no glass-card chrome).
 */
export function AuthShell({
  children,
  footer,
}: {
  children: ReactNode;
  footer?: ReactNode;
}) {
  const reducedMotion = useReducedMotion() ?? false;

  return (
    <div className="relative flex min-h-screen overflow-hidden bg-[#090A0F] font-sans text-[#F5F7FF] selection:bg-blue-600 selection:text-white">
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

      <div className="relative z-10 flex min-h-screen w-full flex-col items-center justify-center px-4 py-24 sm:px-6">
        <motion.div
          initial={reducedMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={
            reducedMotion ? { duration: 0 } : { duration: 0.4, ease: AUTH_EASE }
          }
          className="w-full max-w-[22rem]"
        >
          {children}

          {footer ? (
            <div className="mt-8 border-t border-white/[0.08] pt-6 text-center text-sm text-[#64748B]">
              {footer}
            </div>
          ) : null}
        </motion.div>
      </div>
    </div>
  );
}

export function AuthHeader({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="mb-8">
      <h1 className="text-[clamp(1.75rem,4vw,2.15rem)] font-bold leading-[1.1] tracking-[-0.035em] text-white">
        {title}
      </h1>
      {description ? (
        <p className="mt-3 text-[0.95rem] leading-relaxed text-[#94A3B8]">
          {description}
        </p>
      ) : null}
    </div>
  );
}

export function AuthError({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="rounded-xl border border-red-500/20 bg-red-500/[0.08] px-4 py-3 text-sm text-red-400"
    >
      {message}
    </div>
  );
}

export function AuthDivider({ label = "or" }: { label?: string }) {
  return (
    <div className="my-5 flex items-center gap-3">
      <span className="h-px flex-1 bg-white/[0.08]" />
      <span className="text-[0.7rem] font-medium uppercase tracking-wider text-[#475569]">
        {label}
      </span>
      <span className="h-px flex-1 bg-white/[0.08]" />
    </div>
  );
}

const FIELD_CLASS =
  "w-full rounded-xl border border-white/[0.08] bg-[#0C0F1A]/80 px-3.5 py-3 text-sm text-white outline-none placeholder:text-[#475569] transition-colors focus:border-blue-500/45 focus:ring-2 focus:ring-blue-500/15";

export function AuthTextField({
  id,
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  autoComplete,
}: {
  id: string;
  label: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoComplete?: string;
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
        className={FIELD_CLASS}
      />
    </div>
  );
}

export { FIELD_CLASS as authFieldClassName };
