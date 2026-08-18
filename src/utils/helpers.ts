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
export function getScoreLabel(score: number): string {
    if (score >= 80) return "Great";
    if (score >= 70) return "Good";
    return "Needs Work";
}
