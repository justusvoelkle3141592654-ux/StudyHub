import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowLeftRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { convertUnit, formatNumber, UNIT_CATEGORIES } from "./units";

export function UnitConverter() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language === "en" ? "en" : "de";
  const [categoryId, setCategoryId] = useState(UNIT_CATEGORIES[0].id);
  const category = UNIT_CATEGORIES.find((c) => c.id === categoryId) ?? UNIT_CATEGORIES[0];
  const [from, setFrom] = useState(category.units[0].id);
  const [to, setTo] = useState(category.units[1].id);
  const [value, setValue] = useState("1");

  const changeCategory = (id: string) => {
    const c = UNIT_CATEGORIES.find((x) => x.id === id)!;
    setCategoryId(id);
    setFrom(c.units[0].id);
    setTo(c.units[1].id);
  };

  const result = useMemo(() => {
    const n = Number(value.replace(",", "."));
    if (!value.trim() || !Number.isFinite(n)) return null;
    try {
      return formatNumber(convertUnit(n, from, to), lang);
    } catch {
      return null;
    }
  }, [value, from, to, lang]);

  const table = useMemo(() => {
    const n = Number(value.replace(",", "."));
    if (!Number.isFinite(n)) return [];
    return category.units
      .filter((u) => u.id !== from)
      .map((u) => {
        try {
          return { unit: u, value: formatNumber(convertUnit(n, from, u.id), lang) };
        } catch {
          return { unit: u, value: "–" };
        }
      });
  }, [category, from, value, lang]);

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="unit-category">{t("tools.units.category")}</Label>
        <Select value={categoryId} onValueChange={changeCategory}>
          <SelectTrigger id="unit-category"><SelectValue /></SelectTrigger>
          <SelectContent>
            {UNIT_CATEGORIES.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c[lang]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid items-end gap-3 sm:grid-cols-[1fr_1fr_auto_1fr]">
        <div className="space-y-1.5">
          <Label htmlFor="unit-value">{t("tools.units.value")}</Label>
          <Input id="unit-value" inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} data-testid="unit-value" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="unit-from">{t("tools.units.from")}</Label>
          <Select value={from} onValueChange={setFrom}>
            <SelectTrigger id="unit-from"><SelectValue /></SelectTrigger>
            <SelectContent>
              {category.units.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u[lang]} ({u.symbol})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" size="icon" aria-label={t("tools.units.swap")} onClick={() => { setFrom(to); setTo(from); }}>
          <ArrowLeftRight />
        </Button>
        <div className="space-y-1.5">
          <Label htmlFor="unit-to">{t("tools.units.to")}</Label>
          <Select value={to} onValueChange={setTo}>
            <SelectTrigger id="unit-to"><SelectValue /></SelectTrigger>
            <SelectContent>
              {category.units.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u[lang]} ({u.symbol})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="rounded-xl border bg-card p-4">
        <p className="text-sm text-muted-foreground">{t("tools.units.result")}</p>
        <p className="text-2xl font-semibold tabular-nums" data-testid="unit-result">
          {result ?? "–"} <span className="text-base font-normal text-muted-foreground">{category.units.find((u) => u.id === to)?.symbol}</span>
        </p>
      </div>
      <table className="w-full text-sm">
        <tbody className="divide-y">
          {table.map((row) => (
            <tr key={row.unit.id}>
              <td className="py-1.5 text-muted-foreground">{row.unit[lang]}</td>
              <td className="py-1.5 text-right tabular-nums">
                {row.value} {row.unit.symbol}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
