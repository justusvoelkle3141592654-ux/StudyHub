import { describe, expect, it } from "vitest";
import { convertGrade, formatGradeValue, neededGrade, overallAverage, weightedAverage } from "./gradeMath";

const g = (value: number, weight = 1, scale: "de_1_6" | "points_0_15" | "percent" = "de_1_6") => ({ value, weight, scale });

describe("gradeMath", () => {
  it("computes weighted and unweighted averages", () => {
    expect(weightedAverage([g(1), g(3)], "de_1_6")).toBe(2);
    expect(weightedAverage([g(1, 2), g(3, 1)], "de_1_6")).toBeCloseTo(5 / 3, 6);
    expect(weightedAverage([g(1, 2), g(3, 1)], "de_1_6", false)).toBe(2);
    expect(weightedAverage([], "de_1_6")).toBeNull();
    expect(weightedAverage([g(2, 0)], "de_1_6")).toBeNull();
  });

  it("converts between scales", () => {
    expect(convertGrade(15, "points_0_15", "de_1_6")).toBeCloseTo(0.667, 3);
    expect(convertGrade(11, "points_0_15", "de_1_6")).toBeCloseTo(2, 6);
    expect(convertGrade(2, "de_1_6", "points_0_15")).toBeCloseTo(11, 6);
    expect(convertGrade(100, "percent", "de_1_6")).toBe(1);
    expect(convertGrade(50, "percent", "de_1_6")).toBe(4);
    expect(convertGrade(60, "percent", "de_1_6")).toBeCloseTo(3.5, 6);
    expect(convertGrade(3, "de_1_6", "percent")).toBe(70);
    expect(convertGrade(3, "de_1_6", "de_1_6")).toBe(3);
  });

  it("mixes scales inside one subject", () => {
    // 2.0 in grades and 11 points (= 2.0) average to 2.0
    expect(weightedAverage([g(2), g(11, 1, "points_0_15")], "de_1_6")).toBeCloseTo(2, 6);
  });

  it("overall average is the mean of subject averages", () => {
    expect(overallAverage([2, null, 3])).toBe(2.5);
    expect(overallAverage([null])).toBeNull();
  });

  it("target grade calculator", () => {
    // Current: 3.0 and 2.0 (avg 2.5). Target 2.0 with weight 1 → need 1.0
    const r = neededGrade([g(3), g(2)], 2, 1, "de_1_6");
    expect(r.needed).toBeCloseTo(1, 6);
    expect(r.achievable).toBe(true);
    // Target 1.0 → would need -1 → not achievable
    const r2 = neededGrade([g(3), g(2)], 1, 1, "de_1_6");
    expect(r2.achievable).toBe(false);
    expect(r2.alreadyReached).toBe(false);
    // Target 4.0 with current avg 2.5 → needed 7 > 6 → already reached
    const r3 = neededGrade([g(3), g(2)], 4, 1, "de_1_6");
    expect(r3.alreadyReached).toBe(true);
    // Points scale: current 10 and 12 (avg 11), target 12 with weight 2 → need 13
    const r4 = neededGrade([g(10, 1, "points_0_15"), g(12, 1, "points_0_15")], 12, 2, "points_0_15");
    expect(r4.needed).toBeCloseTo(13, 6);
    expect(r4.achievable).toBe(true);
    // Weighted exam counts double
    const r5 = neededGrade([g(3)], 2, 2, "de_1_6");
    expect(r5.needed).toBeCloseTo(1.5, 6);
  });

  it("formats values per scale", () => {
    expect(formatGradeValue(2.345, "de_1_6")).toBe("2,3");
    expect(formatGradeValue(12.5, "points_0_15")).toBe("12,5");
    expect(formatGradeValue(null, "percent")).toBe("–");
  });
});
