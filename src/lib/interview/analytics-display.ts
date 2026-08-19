import {
  coerceInterviewType,
  INTERVIEW_TYPE_META,
  type InterviewType,
} from "./domain";

export type InterviewTypeLabelVariant = "full" | "short";

const INTERVIEW_TYPE_BADGE_CLASSES: Record<InterviewType, string> = {
  "recruiter-screen": "text-sky-300/90 bg-sky-500/10 border-sky-500/20",
  "behavioral-leadership": "text-sky-300/90 bg-sky-500/10 border-sky-500/20",
  "coding-algorithms": "text-teal-300/90 bg-teal-500/10 border-teal-500/20",
  "system-design": "text-cyan-300/90 bg-cyan-500/10 border-cyan-500/20",
  "domain-role": "text-emerald-300/90 bg-emerald-500/10 border-emerald-500/20",
  "take-home": "text-amber-300/90 bg-amber-500/10 border-amber-500/20",
  "hiring-manager": "text-blue-300/90 bg-blue-500/10 border-blue-500/20",
  "bar-raiser": "text-rose-300/90 bg-rose-500/10 border-rose-500/20",
};

const UNKNOWN_INTERVIEW_TYPE_BADGE_CLASS =
  "text-[#B0B8C8] bg-white/[0.04] border-white/[0.08]";

export function interviewTypeDisplayLabel(
  value: unknown,
  variant: InterviewTypeLabelVariant = "full",
): string | null {
  if (typeof value !== "string" || value.length === 0) return null;

  const interviewType = coerceInterviewType(value);
  if (!interviewType) return value.replace(/[_-]+/g, " ");

  return variant === "short"
    ? INTERVIEW_TYPE_META[interviewType].shortLabel
    : INTERVIEW_TYPE_META[interviewType].label;
}

export function interviewTypeBadgeClass(value: unknown): string {
  const interviewType = coerceInterviewType(value);
  return interviewType
    ? INTERVIEW_TYPE_BADGE_CLASSES[interviewType]
    : UNKNOWN_INTERVIEW_TYPE_BADGE_CLASS;
}

export type MonthCompareTone = "up" | "down" | "neutral" | "new";

export function formatMonthOverMonthChange(
  current: number,
  previous: number,
): { label: string; tone: MonthCompareTone } {
  if (previous === 0 && current === 0) {
    return { label: "No activity last month", tone: "neutral" };
  }
  if (previous === 0 && current > 0) {
    return { label: "New this month", tone: "new" };
  }
  const diff = current - previous;
  if (diff === 0) {
    return { label: "Flat vs last month", tone: "neutral" };
  }
  const pct = Math.round((diff / previous) * 100);
  return {
    label: `${diff > 0 ? "↑" : "↓"} ${Math.abs(pct)}% vs last month`,
    tone: diff > 0 ? "up" : "down",
  };
}

export function monthCompareToneClass(tone: MonthCompareTone): string {
  switch (tone) {
    case "up":
    case "new":
      return "text-emerald-400";
    case "down":
      return "text-rose-300";
    default:
      return "text-[#A8B0C2]";
  }
}

/** X-axis label for a calendar-month bucket (month name only). */
export function formatMonthBucketRange(monthStart: Date): string {
  return monthStart.toLocaleDateString("en-US", { month: "short" });
}

/** Week bucket: Monday start through Sunday end (clipped to today when the week is in progress). */
export function formatWeekBucketRange(weekStart: Date, referenceNow: Date): string {
  const weekEnd = addDays(weekStart, 6);
  const startLabel = weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const effectiveEnd = weekEnd > startOfDay(referenceNow) ? startOfDay(referenceNow) : weekEnd;
  const endLabel = effectiveEnd.toLocaleDateString("en-US", {
    month: weekStart.getMonth() === effectiveEnd.getMonth() ? undefined : "short",
    day: "numeric",
  });
  if (weekStart.toDateString() === effectiveEnd.toDateString()) {
    return startLabel;
  }
  return `${startLabel}–${endLabel}`;
}

function startOfDay(date: Date): Date {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

function addDays(date: Date, days: number): Date {
  const value = new Date(date);
  value.setDate(value.getDate() + days);
  return value;
}
