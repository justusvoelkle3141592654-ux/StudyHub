import { create, all, type MathJsInstance } from "mathjs";

/**
 * Scientific calculator on mathjs with a restricted evaluator (no imports,
 * no unit definitions). Expressions use `^` for powers, `sqrt`, `sin`,
 * `log`, constants `pi` and `e`; the `ans` variable holds the last result.
 */
let calc: MathJsInstance | null = null;

function instance(): MathJsInstance {
  if (!calc) {
    calc = create(all, {});
    const disabled = () => {
      throw new Error("disabled");
    };
    calc.import({ import: disabled, createUnit: disabled, simplify: disabled, derivative: disabled }, { override: true });
  }
  return calc;
}

export interface CalcResult {
  expression: string;
  result: string;
  /** Numeric value when the result is a plain number. */
  value: number | null;
}

const scope: Record<string, unknown> = { ans: 0 };

/** Evaluate an expression; errors are thrown with a readable message. */
export function evaluate(expression: string, angle: "deg" | "rad" = "rad"): CalcResult {
  const m = instance();
  const expr = expression.replace(/,/g, ".").replace(/×/g, "*").replace(/÷/g, "/").replace(/−/g, "-").trim();
  if (!expr) throw new Error("empty");
  const localScope: Record<string, unknown> = { ...scope };
  if (angle === "deg") {
    // Trigonometric functions in degrees.
    const toRad = (x: number) => (x * Math.PI) / 180;
    const toDeg = (x: number) => (x * 180) / Math.PI;
    Object.assign(localScope, {
      sin: (x: number) => Math.sin(toRad(x)),
      cos: (x: number) => Math.cos(toRad(x)),
      tan: (x: number) => Math.tan(toRad(x)),
      asin: (x: number) => toDeg(Math.asin(x)),
      acos: (x: number) => toDeg(Math.acos(x)),
      atan: (x: number) => toDeg(Math.atan(x)),
    });
  }
  const raw = m.evaluate(expr, localScope) as unknown;
  if (typeof raw === "function") throw new Error("Function definitions are not supported");
  const result = m.format(raw, { precision: 12 });
  const value = typeof raw === "number" ? raw : null;
  if (value !== null) scope.ans = value;
  else scope.ans = raw;
  // Persist user-defined variables (e.g. `x = 5`) across evaluations.
  for (const [k, v] of Object.entries(localScope)) if (!(k in scope) && typeof v !== "function") scope[k] = v;
  return { expression: expr, result, value };
}

export function resetCalculator(): void {
  for (const k of Object.keys(scope)) delete scope[k];
  scope.ans = 0;
}
