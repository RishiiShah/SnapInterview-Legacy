/** Shared class fragments for admin actions and dark rehearsal-room surfaces. */

export const adminFieldClass =
  "w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3.5 py-2.5 text-sm text-[#F2F4F8] outline-none placeholder:text-[#A8B0C2] transition-colors focus:border-[#3B82F6]/45 focus:bg-white/[0.05] focus:ring-1 focus:ring-[#3B82F6]/25";

/** Overrides light Input defaults when the shared Input component is reused in admin. */
export const adminInputOverrideClass =
  "!rounded-lg !border-white/[0.08] !bg-white/[0.03] !text-[#F2F4F8] placeholder:!text-[#A8B0C2] focus:!border-[#3B82F6]/45 focus:!bg-white/[0.05] focus:!ring-1 focus:!ring-[#3B82F6]/25";

export const adminPanelClass =
  "rounded-xl border border-white/[0.08] bg-[#12141A]";

export const adminPanelInsetClass =
  "rounded-xl border border-white/[0.06] bg-white/[0.02]";

export const adminTableHeadClass =
  "border-b border-white/[0.08] bg-white/[0.02] text-left text-xs uppercase tracking-wide text-[#A8B0C2]";

export const adminTableRowClass =
  "border-b border-white/[0.05] last:border-b-0";

export const adminHeadingClass =
  "text-2xl font-semibold tracking-tight text-[#F2F4F8]";

export const adminMutedClass = "text-sm text-[#A8B0C2]";

export const adminLabelClass = "text-sm font-medium text-[#C5CBD8]";

export const adminActionButtonClass =
  "cursor-pointer rounded-md border border-white/[0.1] px-2.5 py-1 text-xs font-medium text-[#C5CBD8] transition-colors hover:bg-white/[0.05] hover:text-[#F2F4F8]";

export const adminDangerButtonClass =
  "cursor-pointer rounded-md border border-red-500/30 px-2.5 py-1 text-xs font-medium text-red-300 transition-colors hover:bg-red-500/10";

export const adminActionLinkClass =
  "cursor-pointer rounded-md border border-white/[0.1] px-2.5 py-1 text-xs font-medium text-[#C5CBD8] transition-colors hover:bg-white/[0.05] hover:text-[#F2F4F8]";

export const adminPrimaryLinkClass =
  "cursor-pointer rounded-lg bg-[#3B82F6] px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-[#4B8FF7]";

export const adminSecondaryLinkClass =
  "cursor-pointer rounded-lg border border-white/[0.1] px-3 py-2 text-sm font-medium text-[#C5CBD8] transition-colors hover:bg-white/[0.05] hover:text-[#F2F4F8]";

export const adminPrimaryButtonClass =
  "!border-transparent !bg-[#3B82F6] !text-white !shadow-none hover:!bg-[#4B8FF7] hover:!shadow-none";

export const adminSecondaryButtonClass =
  "!border-white/[0.1] !bg-transparent !text-[#C5CBD8] !shadow-none hover:!border-white/[0.16] hover:!bg-white/[0.05] hover:!text-[#F2F4F8] hover:!shadow-none";

export const adminPaginationLinkClass =
  "cursor-pointer rounded-md border border-white/[0.1] px-3 py-1.5 text-[#C5CBD8] transition-colors hover:bg-white/[0.05] hover:text-[#F2F4F8]";

export const adminPaginationLinkDisabledClass =
  "pointer-events-none cursor-default rounded-md border border-white/[0.06] px-3 py-1.5 text-[#A8B0C2]/40";

/** Applied on AdminShell so interactive controls show a pointer by default. */
export const adminInteractiveClass =
  "[&_button:not(:disabled)]:cursor-pointer [&_a[href]]:cursor-pointer [&_summary]:cursor-pointer";
