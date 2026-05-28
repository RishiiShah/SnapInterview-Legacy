type GrowthPoint = {
  key: string;
  label: string;
  users: number;
  interviews: number;
};

type FunnelItem = {
  label: string;
  value: number;
};

type RetentionSnapshot = {
  label: string;
  value: string;
  hint: string;
};

type AiHealthCard = {
  label: string;
  value: string;
  hint: string;
  tone?: "default" | "warn" | "danger" | "good";
};

type AdminAnalyticsDashboardProps = {
  growth: GrowthPoint[];
  funnel: FunnelItem[];
  retention: RetentionSnapshot[];
  aiHealthCards: AiHealthCard[];
  averageScore: number | null;
  subScores: {
    communication: number | null;
    technicalDepth: number | null;
    clarity: number | null;
  };
};

function toneClass(tone: AiHealthCard["tone"]) {
  switch (tone) {
    case "good":
      return "border-emerald-200 bg-emerald-50";
    case "warn":
      return "border-amber-200 bg-amber-50";
    case "danger":
      return "border-red-200 bg-red-50";
    default:
      return "border-zinc-200 bg-white";
  }
}

export default function AdminAnalyticsDashboard({
  growth,
  funnel,
  retention,
  aiHealthCards,
  averageScore,
  subScores,
}: AdminAnalyticsDashboardProps) {
  const maxGrowth = Math.max(
    1,
    ...growth.map((point) => Math.max(point.users, point.interviews)),
  );
  const funnelBase = Math.max(1, funnel[0]?.value ?? 1);

  return (
    <div className="space-y-6 pb-8">
      <section>
        <h2 className="text-2xl font-semibold tracking-tight text-zinc-900">
          Analytics
        </h2>
        <p className="mt-1 text-sm text-zinc-500">
          Product growth, interview funnel, retention, and AI evaluation health.
        </p>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-zinc-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-zinc-900">14-Day Growth</h3>
          <p className="text-xs text-zinc-400">
            New users vs interviews started each day.
          </p>
          <div className="mt-4 flex min-h-[200px] items-end gap-2">
            {growth.map((point) => {
              const usersHeight = Math.max(4, (point.users / maxGrowth) * 100);
              const interviewsHeight = Math.max(
                4,
                (point.interviews / maxGrowth) * 100,
              );
              return (
                <div
                  key={point.key}
                  className="group flex flex-1 flex-col items-center gap-2"
                >
                  <div className="flex h-40 w-full items-end justify-center gap-1">
                    <div
                      className="w-2 rounded-sm bg-blue-400"
                      style={{ height: `${usersHeight}%` }}
                      title={`${point.label}: ${point.users} users`}
                    />
                    <div
                      className="w-2 rounded-sm bg-zinc-800"
                      style={{ height: `${interviewsHeight}%` }}
                      title={`${point.label}: ${point.interviews} interviews`}
                    />
                  </div>
                  <span className="text-[10px] text-zinc-400">{point.label}</span>
                </div>
              );
            })}
          </div>
          <div className="mt-2 flex items-center gap-4 text-xs text-zinc-500">
            <span className="inline-flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-blue-400" /> Users
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-zinc-800" /> Interviews
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-zinc-900">Completion Funnel</h3>
          <p className="text-xs text-zinc-400">
            Active records only, showing drop-offs per stage.
          </p>
          <div className="mt-4 space-y-3">
            {funnel.map((item) => {
              const pct = Math.round((item.value / funnelBase) * 100);
              return (
                <div key={item.label}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="font-medium text-zinc-700">{item.label}</span>
                    <span className="text-zinc-500">
                      {item.value.toLocaleString()} ({pct}%)
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-zinc-100">
                    <div
                      className="h-full rounded-full bg-zinc-800"
                      style={{ width: `${Math.max(2, pct)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-zinc-900">Retention Snapshot</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {retention.map((card) => (
            <div
              key={card.label}
              className="rounded-xl border border-zinc-200 bg-zinc-50 p-4"
            >
              <p className="text-xs uppercase tracking-wide text-zinc-500">
                {card.label}
              </p>
              <p className="mt-2 text-2xl font-semibold text-zinc-900">
                {card.value}
              </p>
              <p className="mt-1 text-xs text-zinc-500">{card.hint}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-zinc-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-zinc-900">
            Interview Quality
          </h3>
          <p className="mt-3 text-sm text-zinc-600">
            Average score:{" "}
            <span className="font-semibold text-zinc-900">
              {averageScore ?? "N/A"}
            </span>
          </p>
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            {[
              { label: "Communication", value: subScores.communication },
              { label: "Technical", value: subScores.technicalDepth },
              { label: "Clarity", value: subScores.clarity },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-xl border border-zinc-200 bg-zinc-50 p-3"
              >
                <p className="text-[11px] text-zinc-500">{item.label}</p>
                <p className="mt-1 text-xl font-semibold text-zinc-900">
                  {item.value ?? "—"}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-zinc-900">AI Health</h3>
          <div className="mt-3 space-y-3">
            {aiHealthCards.map((card) => (
              <div
                key={card.label}
                className={`rounded-xl border p-3 ${toneClass(card.tone)}`}
              >
                <p className="text-xs uppercase tracking-wide text-zinc-500">
                  {card.label}
                </p>
                <p className="mt-1 text-2xl font-semibold text-zinc-900">
                  {card.value}
                </p>
                <p className="mt-1 text-xs text-zinc-600">{card.hint}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
