import type { Grade, GradeScale } from "@/data/types";

/** Value ranges and direction per scale. */
export const SCALE_INFO: Record<GradeScale, { min: number; max: number; lowerIsBetter: boolean; step: number }> = {
  de_1_6: { min: 1, max: 6, lowerIsBetter: true, step: 0.1 },
  points_0_15: { min: 0, max: 15, lowerIsBetter: false, step: 1 },
  percent: { min: 0, max: 100, lowerIsBetter: false, step: 1 },
};

/**
 * Convert between scales. Points ↔ grade uses the standard German upper
 * school formula (grade = (17 − points) / 3). Percent ↔ grade uses a
 * piecewise linear mapping over common anchor points (100→1, 85→2, 70→3,
 * 50→4, 30→5, 0→6). Schools differ here; the mapping is documented in
 * docs/DATENMODELL.md and only used when a grade's scale differs from the
 * configured one.
 */
export function convertGrade(value: number, from: GradeScale, to: GradeScale): number {
  if (from === to) return value;
  const asGrade = toGrade16(value, from);
  return fromGrade16(asGrade, to);
}

const PERCENT_ANCHORS: Array<[number, number]> = [
  [100, 1],
  [85, 2],
  [70, 3],
  [50, 4],
  [30, 5],
  [0, 6],
];

function toGrade16(value: number, from: GradeScale): number {
  switch (from) {
    case "de_1_6":
      return value;
    case "points_0_15":
      return (17 - value) / 3;
    case "percent":
      return interpolate(value, PERCENT_ANCHORS);
  }
}

function fromGrade16(grade: number, to: GradeScale): number {
  switch (to) {
    case "de_1_6":
      return grade;
    case "points_0_15":
      return 17 - 3 * grade;
    case "percent":
      return interpolate(
        grade,
        PERCENT_ANCHORS.map(([p, g]) => [g, p] as [number, number]).sort((a, b) => a[0] - b[0]),
      );
  }
}

/** Piecewise linear interpolation over sorted (x, y) anchors (any direction). */
function interpolate(x: number, anchors: Array<[number, number]>): number {
  const sorted = [...anchors].sort((a, b) => a[0] - b[0]);
  if (x <= sorted[0][0]) return sorted[0][1];
  if (x >= sorted[sorted.length - 1][0]) return sorted[sorted.length - 1][1];
  for (let i = 0; i < sorted.length - 1; i++) {
    const [x0, y0] = sorted[i];
    const [x1, y1] = sorted[i + 1];
    if (x >= x0 && x <= x1) return y0 + ((x - x0) / (x1 - x0)) * (y1 - y0);
  }
  return sorted[sorted.length - 1][1];
}

export function clampToScale(value: number, scale: GradeScale): number {
  const { min, max } = SCALE_INFO[scale];
  return Math.min(max, Math.max(min, value));
}

/** Weighted average of grades, converted to `scale`. Null when there are no grades. */
export function weightedAverage(grades: Pick<Grade, "value" | "weight" | "scale">[], scale: GradeScale, weighted = true): number | null {
  let sum = 0;
  let weightSum = 0;
  for (const g of grades) {
    const w = weighted ? Math.max(0, g.weight) : 1;
    if (w === 0) continue;
    sum += convertGrade(g.value, g.scale, scale) * w;
    weightSum += w;
  }
  return weightSum > 0 ? sum / weightSum : null;
}

/** Overall average = mean of the subject averages (each subject counts once). */
export function overallAverage(subjectAverages: Array<number | null>): number | null {
  const vals = subjectAverages.filter((v): v is number => v !== null);
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
}

export interface TargetResult {
  /** Grade needed in the next exam, in the configured scale (unclamped). */
  needed: number;
  /** Whether the needed grade lies within the scale range. */
  achievable: boolean;
  /** True when the target is already reached even with the worst possible grade. */
  alreadyReached: boolean;
}

/**
 * "Which grade do I need in the next exam (weight w) to reach average X?"
 * Solves (S + w·v) / (W + w) = X for v.
 */
export function neededGrade(grades: Pick<Grade, "value" | "weight" | "scale">[], target: number, nextWeight: number, scale: GradeScale, weighted = true): TargetResult {
  const w = Math.max(0.0001, nextWeight);
  let sum = 0;
  let weightSum = 0;
  for (const g of grades) {
    const gw = weighted ? Math.max(0, g.weight) : 1;
    sum += convertGrade(g.value, g.scale, scale) * gw;
    weightSum += gw;
  }
  const needed = (target * (weightSum + w) - sum) / w;
  const { min, max, lowerIsBetter } = SCALE_INFO[scale];
  const achievable = needed >= min - 1e-9 && needed <= max + 1e-9;
  const alreadyReached = lowerIsBetter ? needed > max : needed < min;
  return { needed, achievable, alreadyReached };
}

/** Round for display: one decimal for grades, integers for points / percent. */
export function formatGradeValue(value: number | null, scale: GradeScale): string {
  if (value === null || !Number.isFinite(value)) return "–";
  return scale === "de_1_6" ? value.toFixed(1).replace(".", ",") : String(Math.round(value * 10) / 10).replace(".", ",");
}
