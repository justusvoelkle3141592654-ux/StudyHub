import { useTranslation } from "react-i18next";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SUBJECT_COLORS } from "@/features/setup/types";
import { cn } from "@/lib/utils";

/** Swatch button opening a small palette; also accepts a custom hex value. */
export function ColorPicker({ value, onChange, label }: { value: string; onChange: (color: string) => void; label?: string }) {
  const { t } = useTranslation();
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`${t("color.choose")}${label ? `: ${label}` : ""}`}
          className="size-6 shrink-0 rounded-full border-2 border-background shadow ring-1 ring-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          style={{ backgroundColor: value }}
        />
      </PopoverTrigger>
      <PopoverContent className="w-48 p-2" align="start">
        <div className="grid grid-cols-5 gap-2" role="listbox" aria-label={t("color.choose")}>
          {SUBJECT_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              role="option"
              aria-selected={c === value}
              aria-label={c}
              onClick={() => onChange(c)}
              className={cn("size-7 rounded-full ring-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", c === value && "ring-2 ring-foreground")}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
        <label className="mt-2 flex items-center gap-2 text-xs">
          <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="size-6 cursor-pointer border-0 bg-transparent p-0" aria-label={t("color.custom")} />
          {t("color.custom")}
        </label>
      </PopoverContent>
    </Popover>
  );
}
