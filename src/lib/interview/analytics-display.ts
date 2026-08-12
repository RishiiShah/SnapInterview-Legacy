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
