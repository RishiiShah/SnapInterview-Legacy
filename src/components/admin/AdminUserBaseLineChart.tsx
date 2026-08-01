type UserBasePoint = {
  label: string;
  axisLabel: string;
  totalUsers: number;
};

type AdminUserBaseLineChartProps = {
  data: UserBasePoint[];
};

const MAX_X_LABELS = 5;

function formatAxisValue(value: number) {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}k`;
  }
  return value.toLocaleString();
}

/** Evenly spaced indices for first, last, and inner ticks (avoids crowded x-axis). */
function getXTickIndices(count: number, maxLabels = MAX_X_LABELS): number[] {
  if (count <= maxLabels) {
    return Array.from({ length: count }, (_, index) => index);
  }

  const indices = new Set<number>([0, count - 1]);
  const innerSlots = maxLabels - 2;
  for (let slot = 1; slot <= innerSlots; slot += 1) {
    indices.add(Math.round((slot / (innerSlots + 1)) * (count - 1)));
  }

  return [...indices].sort((a, b) => a - b);
}

export function AdminUserBaseLineChart({ data }: AdminUserBaseLineChartProps) {
  if (data.length === 0) {
    return (
      <p className="mt-4 text-sm text-zinc-600">No user data for this period.</p>
    );
  }

  const width = 480;
  const height = 220;
  const padding = { top: 12, right: 12, bottom: 28, left: 44 };
  const xTickIndices = new Set(getXTickIndices(data.length));
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  const values = data.map((point) => point.totalUsers);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const yMin = minValue === maxValue ? Math.max(0, minValue - 1) : minValue;
  const yMax = maxValue;
  const yRange = Math.max(1, yMax - yMin);

  const coords = data.map((point, index) => {
    const x =
      padding.left +
      (data.length <= 1 ? innerW / 2 : (index / (data.length - 1)) * innerW);
    const y =
      padding.top + innerH - ((point.totalUsers - yMin) / yRange) * innerH;
    return { ...point, x, y };
  });

  const linePath = coords
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");

  const areaPath = `${linePath} L ${coords[coords.length - 1]?.x ?? padding.left} ${
    padding.top + innerH
  } L ${coords[0]?.x ?? padding.left} ${padding.top + innerH} Z`;

  const yTicks = [yMin, yMin + yRange / 2, yMax];

  return (
    <div className="mt-4">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-auto w-full"
        role="img"
        aria-label="Total user base over the last 14 days"
      >
        {yTicks.map((tick) => {
          const y = padding.top + innerH - ((tick - yMin) / yRange) * innerH;
          return (
            <g key={tick}>
              <line
                x1={padding.left}
                y1={y}
                x2={padding.left + innerW}
                y2={y}
                className="stroke-zinc-100"
                strokeWidth={1}
              />
              <text
                x={padding.left - 8}
                y={y + 4}
                textAnchor="end"
                className="fill-zinc-400 text-[10px]"
              >
                {formatAxisValue(Math.round(tick))}
              </text>
            </g>
          );
        })}

        <path d={areaPath} className="fill-blue-500/10" />
        <path
          d={linePath}
          fill="none"
          className="stroke-blue-500"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {coords.map((point, index) => (
          <circle
            key={`point-${index}`}
            cx={point.x}
            cy={point.y}
            r={3.5}
            className="fill-blue-500 stroke-white"
            strokeWidth={2}
          >
            <title>
              {point.label}: {point.totalUsers.toLocaleString()} users
            </title>
          </circle>
        ))}

        {coords.map((point, index) => {
          if (!xTickIndices.has(index)) return null;

          const isFirst = index === 0;
          const isLast = index === data.length - 1;
          const textAnchor = isFirst ? "start" : isLast ? "end" : "middle";

          return (
            <g key={`tick-${index}`}>
              <line
                x1={point.x}
                y1={padding.top + innerH}
                x2={point.x}
                y2={padding.top + innerH + 4}
                className="stroke-zinc-300"
                strokeWidth={1}
              />
              <text
                x={point.x}
                y={height - 6}
                textAnchor={textAnchor}
                className="fill-zinc-500 text-[10px]"
              >
                {point.axisLabel}
              </text>
            </g>
          );
        })}
      </svg>
      <p className="mt-2 text-xs text-zinc-600">
        Cumulative registered users at end of each day.
      </p>
    </div>
  );
}
