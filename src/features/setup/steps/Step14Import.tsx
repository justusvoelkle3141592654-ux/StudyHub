import { useState } from "react";
import { useTranslation } from "react-i18next";
import { FileUp, FolderUp, Trash2 } from "lucide-react";
import { StepShell } from "../StepShell";
import { useSetupStore } from "../setupStore";
import { Button } from "@/components/ui/button";
import { pickMarkdownFolder, pickTextFiles } from "@/platform/files";
import { parseAnkiText, parseGradesCsv, parseMarkdownNote, parseTasksCsv } from "@/features/import/parsers";

export function Step14Import() {
  const { t } = useTranslation();
  const draft = useSetupStore((s) => s.draft);
  const patch = useSetupStore((s) => s.patch);
  const [errors, setErrors] = useState<string[]>([]);
  const imp = draft.import;

  const importGrades = async () => {
    const files = await pickTextFiles({ extensions: ["csv", "txt"], filterName: "CSV" });
    const errs: string[] = [];
    const items = files.flatMap((f) => {
      const r = parseGradesCsv(f.text, draft.gradeScale === "none" ? "de_1_6" : draft.gradeScale);
      errs.push(...r.errors.map((e) => `${f.name}: ${e}`));
      return r.items;
    });
    patch({ import: { ...imp, grades: [...imp.grades, ...items] } });
    setErrors(errs);
  };
  const importTasks = async () => {
    const files = await pickTextFiles({ extensions: ["csv", "txt"], filterName: "CSV" });
    const errs: string[] = [];
    const items = files.flatMap((f) => {
      const r = parseTasksCsv(f.text);
      errs.push(...r.errors.map((e) => `${f.name}: ${e}`));
      return r.items;
    });
    patch({ import: { ...imp, tasks: [...imp.tasks, ...items] } });
    setErrors(errs);
  };
  const importCards = async () => {
    const files = await pickTextFiles({ extensions: ["txt", "tsv", "csv"], filterName: "Anki" });
    const errs: string[] = [];
    const items = files.flatMap((f) => {
      const r = parseAnkiText(f.text, f.name.replace(/\.[^.]+$/, ""));
      errs.push(...r.errors.map((e) => `${f.name}: ${e}`));
      return r.items;
    });
    patch({ import: { ...imp, cards: [...imp.cards, ...items] } });
    setErrors(errs);
  };
  const importNotes = async () => {
    const files = await pickTextFiles({ multiple: true, extensions: ["md", "markdown", "txt"], filterName: "Markdown" });
    patch({ import: { ...imp, notes: [...imp.notes, ...files.map((f) => parseMarkdownNote(f.name, f.text, null))] } });
  };
  const importNotesFolder = async () => {
    const { folder, files } = await pickMarkdownFolder();
    patch({ import: { ...imp, notes: [...imp.notes, ...files.map((f) => parseMarkdownNote(f.name, f.text, folder))] } });
  };

  const rows: Array<{ key: keyof typeof imp; label: string; count: number; actions: Array<{ label: string; run: () => Promise<void>; icon: React.ReactNode }> }> = [
    { key: "grades", label: t("setup.import.grades"), count: imp.grades.length, actions: [{ label: t("setup.import.csv"), run: importGrades, icon: <FileUp /> }] },
    { key: "tasks", label: t("setup.import.tasks"), count: imp.tasks.length, actions: [{ label: t("setup.import.csv"), run: importTasks, icon: <FileUp /> }] },
    { key: "cards", label: t("setup.import.cards"), count: imp.cards.length, actions: [{ label: t("setup.import.anki"), run: importCards, icon: <FileUp /> }] },
    {
      key: "notes",
      label: t("setup.import.notes"),
      count: imp.notes.length,
      actions: [
        { label: t("setup.import.markdownFiles"), run: importNotes, icon: <FileUp /> },
        { label: t("setup.import.markdownFolder"), run: importNotesFolder, icon: <FolderUp /> },
      ],
    },
  ];

  return (
    <StepShell title={t("setup.import.title")} description={t("setup.import.description")}>
      <ul className="divide-y rounded-lg border">
        {rows.map((r) => (
          <li key={r.key} className="flex flex-wrap items-center gap-2 p-3">
            <div className="min-w-32 flex-1">
              <p className="text-sm font-medium">{r.label}</p>
              <p className="text-xs text-muted-foreground">{t("setup.import.count", { count: r.count })}</p>
            </div>
            {r.actions.map((a) => (
              <Button key={a.label} variant="outline" size="sm" onClick={() => void a.run()}>
                {a.icon} {a.label}
              </Button>
            ))}
            {r.count > 0 && (
              <Button variant="ghost" size="icon-sm" aria-label={t("common.delete")} onClick={() => patch({ import: { ...imp, [r.key]: [] } })}>
                <Trash2 />
              </Button>
            )}
          </li>
        ))}
      </ul>
      {errors.length > 0 && (
        <div className="max-h-32 overflow-y-auto rounded-lg border border-warning/50 bg-warning/10 p-3 text-xs" role="alert">
          <p className="mb-1 font-medium">{t("setup.import.skippedRows", { count: errors.length })}</p>
          <ul>{errors.slice(0, 20).map((e, i) => <li key={i}>{e}</li>)}</ul>
        </div>
      )}
      <p className="text-xs text-muted-foreground">{t("setup.import.formats")}</p>
    </StepShell>
  );
}
