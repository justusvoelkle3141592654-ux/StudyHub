import { useTranslation } from "react-i18next";
import type { Grade, GradeScale } from "@/data/types";
import { formatDate } from "@/lib/dates";
import { convertGrade, formatGradeValue, SCALE_INFO } from "./gradeMath";

/** Line chart of a subject's grades over time (inline SVG, no dependency). */
export function GradeHistoryChart({ grades, scale, color }: { grades: Grade[]; scale: GradeScale; color: string }) {
  const { t } = useTranslation();
  const info = SCALE_INFO[scale];
  const sorted = [...grades].sort((a, b) => a.date.localeCompare(b.date));
  const w = 560;
  const h = 180;
  const pad = { l: 34, r: 12, t: 10, b: 26 };
  const innerW = w - pad.l - pad.r;
  const innerH = h - pad.t - pad.b;
  // Better grades go up: for "lower is better" scales the axis is flipped.
  const yOf = (v: number) => {
    const rel = (v - info.min) / (info.max - info.min);
    return pad.t + (info.lowerIsBetter ? rel : 1 - rel) * innerH;
  };
  const xOf = (i: number) => (sorted.length === 1 ? pad.l + innerW / 2 : pad.l + (i / (sorted.length - 1)) * innerW);
  const pts = sorted.map((g, i) => ({ x: xOf(i), y: yOf(convertGrade(g.value, g.scale, scale)), g }));
  const ticks = scale === "de_1_6" ? [1, 2, 3, 4, 5, 6] : scale === "points_0_15" ? [0, 5, 10, 15] : [0, 25, 50, 75, 100];

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" role="img" aria-label={t("grades.chartLabel")}>
      {ticks.map((tv) => (
        <g key={tv}>
          <line x1={pad.l} x2={w - pad.r} y1={yOf(tv)} y2={yOf(tv)} stroke="var(--border)" strokeDasharray="2 3" />
          <text x={pad.l - 6} y={yOf(tv) + 3} textAnchor="end" fontSize="10" fill="var(--muted-foreground)">
            {tv}
          </text>
        </g>
      ))}
      {pts.length > 1 && <polyline points={pts.map((p) => `${p.x},${p.y}`).join(" ")} fill="none" stroke={color} strokeWidth="2" />}
      {pts.map((p) => (
        <g key={p.g.id}>
          <circle cx={p.x} cy={p.y} r="4" fill={color}>
            <title>{`${p.g.title}: ${formatGradeValue(p.g.value, p.g.scale)} (${formatDate(`${p.g.date}T00:00:00`)})`}</title>
          </circle>
          <text x={p.x} y={h - 8} textAnchor="middle" fontSize="9" fill="var(--muted-foreground)">
            {formatDate(`${p.g.date}T00:00:00`, "d.M.")}
          </text>
        </g>
      ))}
    </svg>
  );
}
