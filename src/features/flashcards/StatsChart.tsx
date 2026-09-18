import { useTranslation } from "react-i18next";
import { formatDate } from "@/lib/dates";

export interface DayStat {
  day: string;
  reviewed: number;
  correct: number;
}

/** Small inline SVG bar chart: reviewed cards per day with the hit rate as a line. */
export function StatsChart({ stats }: { stats: DayStat[] }) {
  const { t } = useTranslation();
  const days = fillDays(stats, 14);
  const max = Math.max(1, ...days.map((d) => d.reviewed));
  const w = 560;
  const h = 160;
  const pad = { l: 28, r: 8, t: 8, b: 24 };
  const innerW = w - pad.l - pad.r;
  const innerH = h - pad.t - pad.b;
  const barW = innerW / days.length;
  const points = days.map((d, i) => {
    const rate = d.reviewed ? d.correct / d.reviewed : null;
    return rate === null ? null : `${pad.l + i * barW + barW / 2},${pad.t + innerH - rate * innerH}`;
  });
  const total = days.reduce((a, d) => a + d.reviewed, 0);
  const totalCorrect = days.reduce((a, d) => a + d.correct, 0);

  return (
    <figure>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full" role="img" aria-label={t("flashcards.statsChartLabel")}>
        <line x1={pad.l} y1={pad.t + innerH} x2={w - pad.r} y2={pad.t + innerH} stroke="var(--border)" />
        <text x={pad.l - 4} y={pad.t + 10} textAnchor="end" fontSize="10" fill="var(--muted-foreground)">
          {max}
        </text>
        <text x={pad.l - 4} y={pad.t + innerH} textAnchor="end" fontSize="10" fill="var(--muted-foreground)">
          0
        </text>
        {days.map((d, i) => {
          const bh = (d.reviewed / max) * innerH;
          return (
            <g key={d.day}>
              <rect x={pad.l + i * barW + barW * 0.15} y={pad.t + innerH - bh} width={barW * 0.7} height={bh} rx="2" fill="var(--primary)" opacity="0.75">
                <title>{`${formatDate(`${d.day}T00:00:00`)}: ${d.reviewed} (${d.correct} ✓)`}</title>
              </rect>
              {(i % 2 === 0 || days.length <= 7) && (
                <text x={pad.l + i * barW + barW / 2} y={h - 8} textAnchor="middle" fontSize="9" fill="var(--muted-foreground)">
                  {formatDate(`${d.day}T00:00:00`, "d.M.")}
                </text>
              )}
            </g>
          );
        })}
        <polyline points={points.filter(Boolean).join(" ")} fill="none" stroke="var(--success)" strokeWidth="2" />
        {points.map((p, i) => p && <circle key={i} cx={Number(p.split(",")[0])} cy={Number(p.split(",")[1])} r="2.5" fill="var(--success)" />)}
      </svg>
      <figcaption className="mt-1 flex flex-wrap gap-4 text-xs text-muted-foreground">
        <span>
          <span className="mr-1 inline-block size-2.5 rounded-sm bg-primary/75" aria-hidden /> {t("flashcards.reviewedPerDay")}
        </span>
        <span>
          <span className="mr-1 inline-block h-0.5 w-3 bg-success align-middle" aria-hidden /> {t("flashcards.hitRate")}
        </span>
        <span className="ml-auto">
          {t("flashcards.last14", { total, rate: total ? Math.round((totalCorrect / total) * 100) : 0 })}
        </span>
      </figcaption>
    </figure>
  );
}

function fillDays(stats: DayStat[], n: number): DayStat[] {
  const map = new Map(stats.map((s) => [s.day, s]));
  const out: DayStat[] = [];
  const d = new Date();
  d.setDate(d.getDate() - (n - 1));
  for (let i = 0; i < n; i++) {
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    out.push(map.get(key) ?? { day: key, reviewed: 0, correct: 0 });
    d.setDate(d.getDate() + 1);
  }
  return out;
}
