/* ─────────────── User Helpers ─────────────── */
export function getInitials(name: string): string {
    return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
}

/* ─────────────── Score Helpers ─────────────── */
export function getScoreColor(score: number): string {
    if (score >= 80) return "text-emerald-700 bg-emerald-50";
    if (score >= 70) return "text-amber-700 bg-amber-50";
    return "text-red-700 bg-red-50";
}

export function getScoreLabel(score: number): string {
    if (score >= 80) return "Great";
    if (score >= 70) return "Good";
    return "Needs Work";
}

/* ─────────────── Date Helpers ─────────────── */
export function formatDate(date: Date): string {
    return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
    });
}

export function formatRelativeTime(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHr = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHr / 24);

    if (diffMin < 1) return "just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHr < 24) return `${diffHr}h ago`;
    if (diffDay < 7) return `${diffDay}d ago`;
    return formatDate(date);
}

/* ─────────────── Misc ─────────────── */
export function cn(...classes: (string | false | null | undefined)[]): string {
    return classes.filter(Boolean).join(" ");
}
