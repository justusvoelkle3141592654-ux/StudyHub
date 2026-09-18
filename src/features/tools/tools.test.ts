import { describe, expect, it } from "vitest";
import katex from "katex";
import { convertUnit, formatNumber, UNIT_CATEGORIES } from "./units";
import { evaluate, resetCalculator } from "./calculator";
import { FORMULAS, searchFormulas } from "./formulas";
import { ELEMENTS, gridPosition, madelungConfiguration } from "./elements";

describe("unit converter", () => {
  it("converts within every category without error", () => {
    for (const cat of UNIT_CATEGORIES) {
      for (const u of cat.units) {
        const back = convertUnit(convertUnit(1, cat.units[0].id, u.id), u.id, cat.units[0].id);
        expect(back, `${cat.id}: ${u.id}`).toBeCloseTo(1, 6);
      }
    }
  });
  it("knows common factors", () => {
    expect(convertUnit(1, "inch", "cm")).toBeCloseTo(2.54, 10);
    expect(convertUnit(100, "degC", "degF")).toBeCloseTo(212, 10);
    expect(convertUnit(0, "degC", "K")).toBeCloseTo(273.15, 10);
    expect(convertUnit(1, "kWh", "J")).toBeCloseTo(3.6e6, 3);
    expect(convertUnit(1, "atm", "Pa")).toBeCloseTo(101325, 3);
    expect(convertUnit(1, "mile", "km")).toBeCloseTo(1.609344, 6);
    expect(() => convertUnit(1, "m", "kg")).toThrow();
  });
  it("formats numbers per locale", () => {
    expect(formatNumber(2.54, "de")).toBe("2,54");
    expect(formatNumber(1 / 3, "en")).toBe("0.3333333333");
    expect(formatNumber(1e20, "en")).toBe("1e+20");
  });
});

describe("calculator", () => {
  it("evaluates expressions and keeps ans", () => {
    resetCalculator();
    expect(evaluate("2^10").result).toBe("1024");
    expect(evaluate("ans / 4").value).toBe(256);
    expect(evaluate("sqrt(16) + 3!").value).toBe(10);
    expect(evaluate("sin(90)", "deg").value).toBeCloseTo(1, 12);
    expect(evaluate("sin(pi/2)", "rad").value).toBeCloseTo(1, 12);
    expect(evaluate("1,5 × 2").value).toBe(3);
    expect(evaluate("x = 5").value).toBe(5);
    expect(evaluate("x * 2").value).toBe(10);
    expect(() => evaluate("")).toThrow();
    expect(() => evaluate("import(1)")).toThrow();
  });
});

describe("formula collection", () => {
  it("renders every formula with KaTeX", () => {
    for (const f of FORMULAS) {
      expect(() => katex.renderToString(f.latex, { throwOnError: true }), f.id).not.toThrow();
    }
    expect(new Set(FORMULAS.map((f) => f.id)).size).toBe(FORMULAS.length);
  });
  it("searches by name and legend in both languages", () => {
    expect(searchFormulas("ohm", "all", "de").map((f) => f.id)).toContain("ohm");
    expect(searchFormulas("pythag", "all", "en").map((f) => f.id)).toEqual(expect.arrayContaining(["pythagoras", "trig-identity"]));
    expect(searchFormulas("", "geometry", "de").every((f) => f.category === "geometry")).toBe(true);
  });
});

describe("periodic table", () => {
  it("has 118 unique elements with consistent data", () => {
    expect(ELEMENTS).toHaveLength(118);
    expect(new Set(ELEMENTS.map((e) => e.symbol)).size).toBe(118);
    ELEMENTS.forEach((e, i) => expect(e.number).toBe(i + 1));
    const positions = new Set(ELEMENTS.map((e) => `${gridPosition(e).col}/${gridPosition(e).row}`));
    expect(positions.size).toBe(118);
  });
  it("electron configurations sum to the atomic number", () => {
    const CORE: Record<string, number> = { He: 2, Ne: 10, Ar: 18, Kr: 36, Xe: 54, Rn: 86 };
    for (const e of ELEMENTS) {
      const m = /^(?:\[(\w+)\] )?(.*)$/.exec(e.electronConfiguration)!;
      const core = m[1] ? CORE[m[1]] : 0;
      const electrons = m[2]
        .split(" ")
        .filter(Boolean)
        .reduce((sum, orb) => sum + Number(orb.replace(/^\d[spdf]/, "")), 0);
      expect(core + electrons, `${e.symbol}: ${e.electronConfiguration}`).toBe(e.number);
    }
    expect(madelungConfiguration(26)).toBe("[Ar] 3d6 4s2");
    expect(ELEMENTS[23].electronConfiguration).toBe("[Ar] 3d5 4s1"); // Cr
    expect(ELEMENTS[28].electronConfiguration).toBe("[Ar] 3d10 4s1"); // Cu
    expect(ELEMENTS[7].electronConfiguration).toBe("[He] 2s2 2p4"); // O
  });
});
