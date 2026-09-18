import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Delete, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { evaluate, type CalcResult } from "./calculator";

const HISTORY_KEY = "studyhub-calc-history";
const KEYS: Array<Array<{ label: string; insert?: string; action?: "eval" | "clear" | "back" }>> = [
  [{ label: "sin", insert: "sin(" }, { label: "cos", insert: "cos(" }, { label: "tan", insert: "tan(" }, { label: "π", insert: "pi" }, { label: "e", insert: "e" }],
  [{ label: "√", insert: "sqrt(" }, { label: "x²", insert: "^2" }, { label: "xʸ", insert: "^" }, { label: "log", insert: "log10(" }, { label: "ln", insert: "log(" }],
  [{ label: "(", insert: "(" }, { label: ")", insert: ")" }, { label: "n!", insert: "!" }, { label: "ans", insert: "ans" }, { label: "÷", insert: "/" }],
  [{ label: "7", insert: "7" }, { label: "8", insert: "8" }, { label: "9", insert: "9" }, { label: "×", insert: "*" }, { label: "⌫", action: "back" }],
  [{ label: "4", insert: "4" }, { label: "5", insert: "5" }, { label: "6", insert: "6" }, { label: "−", insert: "-" }, { label: "C", action: "clear" }],
  [{ label: "1", insert: "1" }, { label: "2", insert: "2" }, { label: "3", insert: "3" }, { label: "+", insert: "+" }, { label: "=", action: "eval" }],
  [{ label: "0", insert: "0" }, { label: ",", insert: "." }, { label: "%", insert: "%" }, { label: "mod", insert: " mod " }, { label: "x", insert: "x" }],
];

export function Calculator() {
  const { t } = useTranslation();
  const [expr, setExpr] = useState("");
  const [angle, setAngle] = useState<"deg" | "rad">("deg");
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<CalcResult[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? "[]") as CalcResult[];
    } catch {
      return [];
    }
  });
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(-100)));
    } catch {
      /* ignore */
    }
  }, [history]);

  const run = () => {
    try {
      const res = evaluate(expr, angle);
      setHistory((h) => [...h, res].slice(-100));
      setError(null);
      setExpr("");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const press = (k: (typeof KEYS)[number][number]) => {
    if (k.action === "eval") return run();
    if (k.action === "clear") {
      setExpr("");
      setError(null);
    } else if (k.action === "back") setExpr((x) => x.slice(0, -1));
    else if (k.insert) setExpr((x) => x + k.insert);
    inputRef.current?.focus();
  };

  return (
    <div className="mx-auto grid max-w-3xl gap-4 md:grid-cols-[1fr_260px]">
      <div className="space-y-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            run();
          }}
          className="space-y-2"
        >
          <Input ref={inputRef} value={expr} onChange={(e) => setExpr(e.target.value)} placeholder={t("tools.calc.placeholder")} className="h-12 font-mono text-lg" aria-label={t("tools.calc.expression")} autoFocus data-testid="calc-input" />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">{t("tools.calc.angle")}:</span>
            {(["deg", "rad"] as const).map((a) => (
              <Button key={a} type="button" size="sm" variant={angle === a ? "secondary" : "ghost"} onClick={() => setAngle(a)} aria-pressed={angle === a}>
                {a === "deg" ? t("tools.calc.degrees") : t("tools.calc.radians")}
              </Button>
            ))}
          </div>
        </form>
        <div className="grid grid-cols-5 gap-1.5" role="group" aria-label={t("tools.calc.keypad")}>
          {KEYS.flat().map((k, i) => (
            <Button key={i} type="button" variant={k.action === "eval" ? "default" : /^\d$/.test(k.label) || k.label === "," ? "outline" : "secondary"} className={cn("h-11 text-base", k.action === "eval" && "font-semibold")} onClick={() => press(k)} aria-label={k.label}>
              {k.label === "⌫" ? <Delete /> : k.label}
            </Button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">{t("tools.calc.hint")}</p>
      </div>
      <aside className="flex max-h-[70vh] flex-col rounded-xl border bg-card" aria-label={t("tools.calc.history")}>
        <div className="flex items-center justify-between border-b px-3 py-2">
          <span className="text-sm font-medium">{t("tools.calc.history")}</span>
          <Button variant="ghost" size="icon-sm" aria-label={t("tools.calc.clearHistory")} onClick={() => setHistory([])} disabled={!history.length}>
            <Trash2 />
          </Button>
        </div>
        <ul className="flex-1 space-y-1 overflow-y-auto p-2 text-sm" data-testid="calc-history">
          {history.length === 0 && <li className="text-xs text-muted-foreground">{t("common.noData")}</li>}
          {[...history].reverse().map((h, i) => (
            <li key={i}>
              <button type="button" className="w-full rounded px-2 py-1 text-left hover:bg-accent" onClick={() => setExpr(h.result)} title={t("tools.calc.reuse")}>
                <span className="block truncate font-mono text-xs text-muted-foreground">{h.expression}</span>
                <span className="block truncate font-mono font-medium">= {h.result}</span>
              </button>
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}
