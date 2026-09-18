import { useMemo } from "react";
import { addDays, endOfMonth, isSameDay, isSameMonth, startOfMonth } from "date-fns";
import { formatDate, mondayOf, toDateKey } from "@/lib/dates";
import { cn } from "@/lib/utils";

export interface CalendarItem {
  id: string;
  date: string; // ISO or YYYY-MM-DD
  label: string;
  color: string;
  kind: "task" | "exam";
  done?: boolean;
  onClick?: () => void;
}

/** Simple month grid, Monday first, with up to three items per day. */
export function CalendarMonth({ month, items }: { month: Date; items: CalendarItem[] }) {
  const start = mondayOf(startOfMonth(month));
  const end = endOfMonth(month);
  const days: Date[] = [];
  for (let d = start; d <= end || days.length % 7 !== 0; d = addDays(d, 1)) days.push(d);
  const byDay = useMemo(() => {
    const map = new Map<string, CalendarItem[]>();
    for (const it of items) {
      const key = it.date.slice(0, 10);
      map.set(key, [...(map.get(key) ?? []), it]);
    }
    return map;
  }, [items]);
  const today = new Date();
  return (
    <div className="grid grid-cols-7 overflow-hidden rounded-xl border bg-card text-xs">
      {days.slice(0, 7).map((d) => (
        <div key={toDateKey(d)} className="border-b bg-muted/40 p-1.5 text-center font-medium text-muted-foreground">
          {formatDate(d, "EEE")}
        </div>
      ))}
      {days.map((d) => {
        const key = toDateKey(d);
        const dayItems = byDay.get(key) ?? [];
        return (
          <div key={key} className={cn("min-h-20 border-b border-r p-1", !isSameMonth(d, month) && "bg-muted/20 text-muted-foreground")}>
            <div className={cn("mb-1 inline-flex size-5 items-center justify-center rounded-full", isSameDay(d, today) && "bg-primary text-primary-foreground")}>{d.getDate()}</div>
            <ul className="space-y-0.5">
              {dayItems.slice(0, 3).map((it) => (
                <li key={it.id}>
                  <button
                    type="button"
                    onClick={it.onClick}
                    className={cn("flex w-full items-center gap-1 truncate rounded px-1 text-left hover:bg-accent", it.done && "line-through opacity-60")}
                    title={it.label}
                  >
                    <span className={cn("size-1.5 shrink-0 rounded-full", it.kind === "exam" && "ring-2 ring-offset-1 ring-current")} style={{ backgroundColor: it.color }} aria-hidden />
                    <span className="truncate">{it.label}</span>
                  </button>
                </li>
              ))}
              {dayItems.length > 3 && <li className="px-1 text-muted-foreground">+{dayItems.length - 3}</li>}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
