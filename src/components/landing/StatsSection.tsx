import { FadeInStagger, FadeInStaggerItem } from "@/components/ui/motion";

export default function StatsSection() {
  return (
    <section className="py-20 px-6">
      <FadeInStagger className="mx-auto grid max-w-4xl gap-8 text-center sm:grid-cols-3">
        {[
          { value: "50k+", label: "Mock Interviews Completed" },
          { value: "93%", label: "Users Report More Confidence" },
          { value: "4.9/5", label: "Average User Rating" },
        ].map((s) => (
          <FadeInStaggerItem key={s.label}>
            <p className="text-4xl font-bold tracking-tight text-zinc-900">{s.value}</p>
            <p className="mt-1 text-sm text-zinc-500">{s.label}</p>
          </FadeInStaggerItem>
        ))}
      </FadeInStagger>
    </section>
  );
}
