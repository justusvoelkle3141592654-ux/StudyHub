import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Katex } from "./Katex";
import { FORMULA_CATEGORIES, searchFormulas, type FormulaCategory } from "./formulas";

export function FormulaCollection() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language === "en" ? "en" : "de";
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<FormulaCategory | "all">("all");
  const list = useMemo(() => searchFormulas(query, category, lang), [query, category, lang]);

  return (
    <div className="space-y-4">
      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-2 top-2.5 size-4 text-muted-foreground" aria-hidden />
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("tools.formulas.search")} className="pl-8" aria-label={t("common.search")} data-testid="formula-search" />
      </div>
      <div className="flex flex-wrap gap-1.5" role="tablist" aria-label={t("tools.formulas.categories")}>
        {[{ id: "all" as const, de: "Alle", en: "All" }, ...FORMULA_CATEGORIES].map((c) => (
          <button
            key={c.id}
            type="button"
            role="tab"
            aria-selected={category === c.id}
            onClick={() => setCategory(c.id)}
            className={cn("rounded-full border px-3 py-1 text-xs transition-colors hover:bg-accent", category === c.id && "border-primary bg-primary text-primary-foreground hover:bg-primary")}
          >
            {c[lang]}
          </button>
        ))}
      </div>
      {list.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("notes.noHits")}</p>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2" data-testid="formula-list">
          {list.map((f) => (
            <li key={f.id} className="rounded-xl border bg-card p-4">
              <div className="mb-1 flex items-baseline justify-between gap-2">
                <h3 className="font-medium">{f.name[lang]}</h3>
                <span className="text-xs text-muted-foreground">{FORMULA_CATEGORIES.find((c) => c.id === f.category)?.[lang]}</span>
              </div>
              <div className="overflow-x-auto py-2">
                <Katex latex={f.latex} />
              </div>
              {f.legend[lang] && <p className="text-xs text-muted-foreground">{f.legend[lang]}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
