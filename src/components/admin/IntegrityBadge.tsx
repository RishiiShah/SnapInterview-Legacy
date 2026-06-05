import type { RecordingIntegrityView } from "@/lib/admin/recording-integrity";

const toneClasses = {
  neutral: "border-zinc-200 bg-zinc-50 text-zinc-700",
  success: "border-emerald-200 bg-emerald-50 text-emerald-700",
  warning: "border-amber-200 bg-amber-50 text-amber-800",
  danger: "border-red-200 bg-red-50 text-red-700",
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
