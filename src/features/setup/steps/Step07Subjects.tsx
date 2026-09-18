import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Trash2 } from "lucide-react";
import { StepShell } from "../StepShell";
import { useSetupStore } from "../setupStore";
import { PROFILE_SUBJECT_SUGGESTIONS, SUBJECT_COLORS } from "../types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ColorPicker } from "@/components/ColorPicker";

export function Step07Subjects() {
  const { t } = useTranslation();
  const draft = useSetupStore((s) => s.draft);
  const patch = useSetupStore((s) => s.patch);
  const [name, setName] = useState("");

  const add = (n: string) => {
    const trimmed = n.trim();
    if (!trimmed || draft.subjects.some((s) => s.name.toLowerCase() === trimmed.toLowerCase())) return;
    patch({ subjects: [...draft.subjects, { name: trimmed, color: SUBJECT_COLORS[draft.subjects.length % SUBJECT_COLORS.length] }] });
    setName("");
  };
  const suggestions = PROFILE_SUBJECT_SUGGESTIONS[draft.profile].filter(
    (s) => !draft.subjects.some((d) => d.name.toLowerCase() === s.toLowerCase()),
  );
  const label = draft.profile === "work" ? t("setup.subjects.projects") : t("setup.subjects.subjects");

  return (
    <StepShell title={t("setup.subjects.title", { what: label })} description={t("setup.subjects.description")}>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          add(name);
        }}
      >
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("setup.subjects.placeholder")} aria-label={label} data-testid="subject-name" />
        <Button type="submit" disabled={!name.trim()}>
          <Plus /> {t("common.add")}
        </Button>
      </form>
      {suggestions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <span className="text-xs text-muted-foreground self-center">{t("setup.subjects.suggestions")}:</span>
          {suggestions.map((s) => (
            <Button key={s} variant="secondary" size="sm" onClick={() => add(s)}>
              {s}
            </Button>
          ))}
        </div>
      )}
      <ul className="divide-y rounded-lg border" aria-label={label}>
        {draft.subjects.length === 0 && <li className="p-3 text-sm text-muted-foreground">{t("common.noData")}</li>}
        {draft.subjects.map((s, i) => (
          <li key={s.name} className="flex items-center gap-3 p-2 pl-3">
            <ColorPicker value={s.color} onChange={(color) => patch({ subjects: draft.subjects.map((x, j) => (j === i ? { ...x, color } : x)) })} label={s.name} />
            <span className="flex-1 text-sm">{s.name}</span>
            <Button variant="ghost" size="icon-sm" aria-label={`${t("common.delete")} ${s.name}`} onClick={() => patch({ subjects: draft.subjects.filter((_, j) => j !== i) })}>
              <Trash2 />
            </Button>
          </li>
        ))}
      </ul>
    </StepShell>
  );
}
