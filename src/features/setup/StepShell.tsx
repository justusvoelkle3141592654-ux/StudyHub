import type { ReactNode } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export function StepShell({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section aria-labelledby="setup-step-title" className="space-y-5">
      <div>
        <h2 id="setup-step-title" className="text-xl font-semibold tracking-tight">
          {title}
        </h2>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {children}
    </section>
  );
}

export interface OptionItem<V extends string> {
  value: V;
  label: string;
  description?: string;
  disabled?: boolean;
  badge?: string;
}

/** Radio-like list of large clickable cards. */
export function OptionCards<V extends string>({
  value,
  onChange,
  options,
  name,
  columns = 1,
}: {
  value: V;
  onChange: (v: V) => void;
  options: OptionItem<V>[];
  name: string;
  columns?: 1 | 2;
}) {
  return (
    <div role="radiogroup" aria-label={name} className={cn("grid gap-3", columns === 2 && "sm:grid-cols-2")}>
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={o.disabled}
            data-testid={`option-${o.value}`}
            onClick={() => onChange(o.value)}
            className={cn(
              "flex items-start gap-3 rounded-lg border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
              selected ? "border-primary bg-primary/5" : "hover:bg-accent/50",
              o.disabled && "cursor-not-allowed opacity-60",
            )}
          >
            <span
              className={cn(
                "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border",
                selected ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40",
              )}
              aria-hidden
            >
              {selected && <Check className="size-3.5" />}
            </span>
            <span className="min-w-0">
              <span className="flex flex-wrap items-center gap-2 font-medium">
                {o.label}
                {o.badge && <span className="rounded bg-muted px-1.5 py-0.5 text-[11px] font-normal text-muted-foreground">{o.badge}</span>}
              </span>
              {o.description && <span className="mt-1 block text-sm text-muted-foreground">{o.description}</span>}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function FieldRow({ label, htmlFor, hint, children }: { label: string; htmlFor?: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <label htmlFor={htmlFor} className="text-sm font-medium">
        {label}
        {hint && <span className="block text-xs font-normal text-muted-foreground">{hint}</span>}
      </label>
      <div className="sm:w-56">{children}</div>
    </div>
  );
}
