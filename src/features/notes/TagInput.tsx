import { useState } from "react";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";

/** Chip-style tag editor: Enter or comma adds a tag, Backspace removes the last one. */
export function TagInput({ value, onChange }: { value: string[]; onChange: (tags: string[]) => void }) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState("");

  const commit = () => {
    const tag = draft.trim().replace(/^#/, "");
    if (tag && !value.includes(tag)) onChange([...value, tag]);
    setDraft("");
  };

  return (
    <div className="flex min-h-9 flex-1 flex-wrap items-center gap-1 rounded-md border px-2 py-1" role="group" aria-label={t("notes.tags")}>
      {value.map((tag) => (
        <span key={tag} className="inline-flex items-center gap-1 rounded bg-secondary px-1.5 py-0.5 text-xs">
          #{tag}
          <button type="button" aria-label={`${t("common.delete")} #${tag}`} onClick={() => onChange(value.filter((x) => x !== tag))} className="rounded hover:bg-accent">
            <X className="size-3" />
          </button>
        </span>
      ))}
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            commit();
          } else if (e.key === "Backspace" && !draft && value.length) {
            onChange(value.slice(0, -1));
          }
        }}
        onBlur={commit}
        placeholder={t("notes.addTag")}
        className="min-w-24 flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground"
        aria-label={t("notes.addTag")}
        data-testid="tag-input"
      />
    </div>
  );
}
