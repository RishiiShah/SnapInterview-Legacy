/** Shared class fragments for admin actions (links styled as buttons). */
export const adminActionButtonClass =
  "cursor-pointer rounded-md border border-zinc-200 px-2.5 py-1 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-100";

export const adminDangerButtonClass =
  "cursor-pointer rounded-md border border-red-200 px-2.5 py-1 text-xs font-medium text-red-700 transition-colors hover:bg-red-50";

export const adminActionLinkClass =
  "cursor-pointer rounded-md border border-zinc-200 px-2.5 py-1 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-100";

export const adminPrimaryLinkClass =
  "cursor-pointer rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700";

export const adminSecondaryLinkClass =
  "cursor-pointer rounded-lg border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100";

export const adminPaginationLinkClass =
  "cursor-pointer rounded-md border border-zinc-200 px-3 py-1.5 text-zinc-700 transition-colors hover:bg-zinc-100";

export const adminPaginationLinkDisabledClass =
  "pointer-events-none cursor-default rounded-md border border-zinc-100 px-3 py-1.5 text-zinc-300";

/** Applied on AdminShell so interactive controls show a pointer by default. */
export const adminInteractiveClass =
  "[&_button:not(:disabled)]:cursor-pointer [&_a[href]]:cursor-pointer [&_summary]:cursor-pointer";
