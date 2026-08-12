"use client";

import { useState } from "react";
import {
  companyInitials,
  resolveCompanyBrand,
  simpleIconsUrl,
} from "@/lib/company-brands";

type CompanyMarkProps = {
  company?: string | null;
  /** Visual size in session lists */
  size?: "sm" | "md";
  className?: string;
};

/**
 * Glass company mark inspired by Uiverse social chips —
 * toned down for session rows (no wild rotate; nestable inside buttons).
 */
export function CompanyMark({ company, size = "md", className = "" }: CompanyMarkProps) {
  const brand = resolveCompanyBrand(company);
  const [failed, setFailed] = useState(false);
  const showIcon = Boolean(brand) && !failed;
  const accent = brand?.color ?? "94A3B8";
  const accentHex = `#${accent}`;
  const initials = companyInitials(company);

  const dim = size === "sm" ? "h-8 w-8" : "h-10 w-10";
  const iconDim = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";
  const textDim = size === "sm" ? "text-[10px]" : "text-[11px]";

  return (
    <div
      className={[
        "group/mark relative shrink-0 overflow-hidden rounded-full border backdrop-blur-lg",
        "bg-gradient-to-tr from-black/60 to-black/40 shadow-lg",
        "transition-all duration-300 ease-out",
        "group-hover:scale-105 group-hover:shadow-xl",
        dim,
        className,
      ].join(" ")}
      style={{ borderColor: `${accentHex}33` }}
      aria-hidden
      title={company?.trim() || undefined}
    >
      <div
        className="pointer-events-none absolute inset-0 -translate-x-full transition-transform duration-700 ease-out group-hover:translate-x-full"
        style={{
          backgroundImage: `linear-gradient(to right, transparent, ${accentHex}40, transparent)`,
        }}
      />

      <div className="relative z-10 flex h-full w-full items-center justify-center">
        {showIcon && brand ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={simpleIconsUrl(brand.slug, accent)}
            alt=""
            className={`${iconDim} object-contain opacity-95`}
            loading="lazy"
            decoding="async"
            onError={() => setFailed(true)}
          />
        ) : (
          <span
            className={`font-semibold tracking-tight ${textDim}`}
            style={{ color: accentHex }}
          >
            {initials}
          </span>
        )}
      </div>
    </div>
  );
}
