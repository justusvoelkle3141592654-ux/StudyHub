import { useTranslation } from "react-i18next";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Subject } from "@/data/types";
import { SubjectDot } from "./SubjectBadge";

const NONE = "__none__";

export function SubjectSelect({
  subjects,
  value,
  onChange,
  id,
  allowNone = true,
  allLabel,
}: {
  subjects: Subject[];
  value: string | null;
  onChange: (id: string | null) => void;
  id?: string;
  allowNone?: boolean;
  /** When set, the "none" entry reads as "all" (filter usage). */
  allLabel?: string;
}) {
  const { t } = useTranslation();
  return (
    <Select value={value ?? NONE} onValueChange={(v) => onChange(v === NONE ? null : v)}>
      <SelectTrigger id={id} aria-label={t("subjects.subject")}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {allowNone && <SelectItem value={NONE}>{allLabel ?? t("subjects.noSubject")}</SelectItem>}
        {subjects.map((s) => (
          <SelectItem key={s.id} value={s.id}>
            <span className="inline-flex items-center gap-2">
              <SubjectDot color={s.color} />
              {s.name}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
