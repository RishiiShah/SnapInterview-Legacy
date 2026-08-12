import type { RecordingIntegrityView } from "@/lib/admin/recording-integrity";

const toneClasses = {
  neutral: "border-white/[0.1] bg-white/[0.03] text-[#C5CBD8]",
  success: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  warning: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  danger: "border-red-500/30 bg-red-500/10 text-red-300",
} as const;

export function IntegrityBadge({ integrity }: { integrity: RecordingIntegrityView }) {
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${toneClasses[integrity.tone]}`}
      title={integrity.description}
    >
      {integrity.label}
    </span>
  );
}
