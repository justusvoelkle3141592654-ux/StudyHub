import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ImagePlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getRepos } from "@/data/db";
import type { Flashcard } from "@/data/types";
import { reportError } from "@/lib/logger";
import { MarkdownPreview } from "@/features/notes/MarkdownPreview";
import { pickImageAsDataUrl } from "@/platform/images";
import { SETTINGS } from "@/app/settingsKeys";
import { getSetting } from "@/stores/settingsStore";
import { startingEase } from "./sm2";
import type { ReviewIntensity } from "@/features/setup/types";

function Side({ id, label, value, onChange }: { id: string; label: string; value: string; onChange: (v: string) => void }) {
  const { t } = useTranslation();
  const addImage = async () => {
    const dataUrl = await pickImageAsDataUrl();
    if (dataUrl) onChange(`${value}${value && !value.endsWith("\n") ? "\n" : ""}![](${dataUrl})\n`);
  };
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label htmlFor={id}>{label}</Label>
        <Button type="button" variant="ghost" size="sm" onClick={() => void addImage()}>
          <ImagePlus /> {t("flashcards.addImage")}
        </Button>
      </div>
      <Textarea id={id} value={value} onChange={(e) => onChange(e.target.value)} rows={3} className="font-mono text-sm" data-testid={id} />
      {value.trim() && (
        <div className="rounded-md border bg-muted/30 p-2">
          <MarkdownPreview markdown={value} />
        </div>
      )}
    </div>
  );
}

export function CardDialog({ open, onOpenChange, deckId, card }: { open: boolean; onOpenChange: (o: boolean) => void; deckId: string; card: Flashcard | null }) {
  const { t } = useTranslation();
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setFront(card?.front ?? "");
    setBack(card?.back ?? "");
  }, [open, card]);

  const save = async (addAnother: boolean) => {
    if (!front.trim() || !back.trim()) return;
    setSaving(true);
    try {
      const repos = getRepos();
      if (card) await repos.flashcards.update(card.id, { front: front.trim(), back: back.trim() });
      else {
        const intensity = getSetting<ReviewIntensity>(SETTINGS.flashcardsIntensity, "normal");
        await repos.flashcards.insert({ deck_id: deckId, front: front.trim(), back: back.trim(), ease_factor: startingEase(intensity) });
      }
      if (addAnother) {
        setFront("");
        setBack("");
        document.getElementById("card-front")?.focus();
      } else onOpenChange(false);
    } catch (e) {
      toast.error(t("common.errorGeneric"), { description: reportError("flashcards", "save card failed", e) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{card ? t("flashcards.editCard") : t("flashcards.newCard")}</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void save(false);
          }}
        >
          <Side id="card-front" label={t("flashcards.front")} value={front} onChange={setFront} />
          <Side id="card-back" label={t("flashcards.back")} value={back} onChange={setBack} />
          <p className="text-xs text-muted-foreground">{t("flashcards.markdownHint")}</p>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("common.cancel")}
            </Button>
            {!card && (
              <Button type="button" variant="secondary" disabled={saving || !front.trim() || !back.trim()} onClick={() => void save(true)} data-testid="card-save-another">
                {t("flashcards.saveAndNext")}
              </Button>
            )}
            <Button type="submit" disabled={saving || !front.trim() || !back.trim()} data-testid="card-save">
              {t("common.save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
