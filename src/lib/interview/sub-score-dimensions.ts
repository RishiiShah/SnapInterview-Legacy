export type SubScoreDimensionKey = "communication" | "technicalDepth" | "clarity";

export const SUB_SCORE_DIMENSIONS: {
  key: SubScoreDimensionKey;
  label: string;
  summary: string;
  barClass: string;
}[] = [
  {
    key: "communication",
    label: "Communication",
    summary: "How clearly you explain ideas and handle follow-ups.",
    barClass: "bg-[#3B82F6]/80",
  },
  {
    key: "technicalDepth",
    label: "Technical depth",
    summary: "How strong your knowledge and reasoning are on the topic.",
    barClass: "bg-cyan-400/80",
  },
  {
    key: "clarity",
    label: "Structure",
    summary: "How organized your answers are—setup, logic, and wrap-up.",
    barClass: "bg-teal-400/80",
  },
];

export function scoreToneClass(value: number | null): string {
  if (value == null) return "text-[#A8B0C2]";
  if (value >= 80) return "text-emerald-400";
  if (value >= 70) return "text-amber-300";
  return "text-rose-300";
}
