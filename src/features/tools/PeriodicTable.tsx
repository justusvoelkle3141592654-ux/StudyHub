import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { CATEGORY_LABELS, ELEMENTS, gridPosition, type ChemElement } from "./elements";

export function PeriodicTable() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language === "en" ? "en" : "de";
  const [selected, setSelected] = useState<ChemElement | null>(null);
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const matches = useMemo(() => new Set(q ? ELEMENTS.filter((e) => e.symbol.toLowerCase() === q || e.name.de.toLowerCase().includes(q) || e.name.en.toLowerCase().includes(q) || String(e.number) === q).map((e) => e.number) : []), [q]);

  return (
    <div className="space-y-3">
      <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("tools.elements.search")} className="max-w-xs" aria-label={t("common.search")} data-testid="element-search" />
      <div className="overflow-x-auto">
        <div className="grid min-w-[900px] gap-1" style={{ gridTemplateColumns: "repeat(18, minmax(0, 1fr))" }} role="grid" aria-label={t("tools.elements.title")}>
          {ELEMENTS.map((el) => {
            const { col, row } = gridPosition(el);
            const dim = q && !matches.has(el.number);
            return (
              <button
                key={el.number}
                type="button"
                role="gridcell"
                onClick={() => setSelected(el)}
                className={cn("flex aspect-square flex-col items-center justify-center rounded border border-black/10 p-0.5 text-[#1f2937] transition-opacity hover:ring-2 hover:ring-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", dim && "opacity-25")}
                style={{ gridColumn: col, gridRow: row + (row >= 9 ? 1 : 0), backgroundColor: CATEGORY_LABELS[el.category].color }}
                aria-label={`${el.number} ${el.name[lang]}`}
                data-testid={`element-${el.symbol}`}
              >
                <span className="text-[9px] leading-none opacity-70">{el.number}</span>
                <span className="text-sm font-semibold leading-tight">{el.symbol}</span>
                <span className="hidden truncate text-[8px] leading-none lg:block">{el.name[lang]}</span>
              </button>
            );
          })}
        </div>
      </div>
      <ul className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
        {(Object.keys(CATEGORY_LABELS) as Array<keyof typeof CATEGORY_LABELS>).map((k) => (
          <li key={k} className="inline-flex items-center gap-1">
            <span className="inline-block size-3 rounded-sm border border-black/10" style={{ backgroundColor: CATEGORY_LABELS[k].color }} aria-hidden />
            {CATEGORY_LABELS[k][lang]}
          </li>
        ))}
      </ul>
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-md">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <span className="flex size-14 flex-col items-center justify-center rounded-md border text-[#1f2937]" style={{ backgroundColor: CATEGORY_LABELS[selected.category].color }}>
                    <span className="text-xl font-bold leading-none">{selected.symbol}</span>
                    <span className="text-[10px]">{selected.number}</span>
                  </span>
                  <span>
                    {selected.name[lang]}
                    <span className="block text-sm font-normal text-muted-foreground">{CATEGORY_LABELS[selected.category][lang]}</span>
                  </span>
                </DialogTitle>
                <DialogDescription className="sr-only">{selected.name[lang]}</DialogDescription>
              </DialogHeader>
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm" data-testid="element-detail">
                <dt className="text-muted-foreground">{t("tools.elements.number")}</dt>
                <dd>{selected.number}</dd>
                <dt className="text-muted-foreground">{t("tools.elements.mass")}</dt>
                <dd>
                  {selected.massIsIsotope ? `[${selected.mass}]` : String(selected.mass).replace(".", lang === "de" ? "," : ".")} u{selected.massIsIsotope && <span className="block text-xs text-muted-foreground">{t("tools.elements.isotopeHint")}</span>}
                </dd>
                <dt className="text-muted-foreground">{t("tools.elements.group")}</dt>
                <dd>{selected.group ?? "–"}</dd>
                <dt className="text-muted-foreground">{t("tools.elements.period")}</dt>
                <dd>{selected.period}</dd>
                <dt className="text-muted-foreground">{t("tools.elements.block")}</dt>
                <dd>{selected.block}</dd>
                <dt className="text-muted-foreground">{t("tools.elements.configuration")}</dt>
                <dd className="font-mono">{selected.electronConfiguration}</dd>
                <dt className="text-muted-foreground">{t("tools.elements.nameEn")}</dt>
                <dd>{lang === "de" ? selected.name.en : selected.name.de}</dd>
              </dl>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
