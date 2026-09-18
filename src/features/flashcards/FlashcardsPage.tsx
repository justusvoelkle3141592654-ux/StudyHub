import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import { GraduationCap, Layers, Play, Plus } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getRepos } from "@/data/db";
import type { FlashcardDeck } from "@/data/types";
import { useRepoQuery } from "@/hooks/useRepoQuery";
import { useSubjects } from "@/features/subjects/useSubjects";
import { SubjectBadge } from "@/features/subjects/SubjectBadge";
import { SubjectSelect } from "@/features/subjects/SubjectSelect";
import { reportError } from "@/lib/logger";
import { todayKey } from "@/lib/dates";
import { StatsChart } from "./StatsChart";
import { EmptyState } from "@/components/EmptyState";

export function DeckDialog({ open, onOpenChange, deck }: { open: boolean; onOpenChange: (o: boolean) => void; deck: FlashcardDeck | null }) {
  const { t } = useTranslation();
  const { subjects } = useSubjects();
  const [name, setName] = useState(deck?.name ?? "");
  const [subjectId, setSubjectId] = useState<string | null>(deck?.subject_id ?? null);
  const [description, setDescription] = useState(deck?.description ?? "");
  const navigate = useNavigate();

  const save = async () => {
    if (!name.trim()) return;
    try {
      const repos = getRepos();
      const data = { name: name.trim(), subject_id: subjectId, description: description.trim() || null };
      if (deck) await repos.decks.update(deck.id, data);
      else {
        const created = await repos.decks.insert(data);
        navigate(`/flashcards/${created.id}`);
      }
      onOpenChange(false);
    } catch (e) {
      toast.error(t("common.errorGeneric"), { description: reportError("flashcards", "save deck failed", e) });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{deck ? t("flashcards.editDeck") : t("flashcards.newDeck")}</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="deck-name">{t("flashcards.deckName")}</Label>
            <Input id="deck-name" value={name} onChange={(e) => setName(e.target.value)} autoFocus required data-testid="deck-name" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="deck-subject">{t("subjects.subject")}</Label>
            <SubjectSelect id="deck-subject" subjects={subjects} value={subjectId} onChange={setSubjectId} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="deck-desc">{t("flashcards.description")}</Label>
            <Textarea id="deck-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={!name.trim()} data-testid="deck-save">
              {t("common.save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function FlashcardsPage() {
  const { t } = useTranslation();
  const { get } = useSubjects();
  const [dialogOpen, setDialogOpen] = useState(false);
  const { data: decks } = useRepoQuery(() => getRepos().decks.getAll(), ["flashcard_decks"]);
  const { data: counts } = useRepoQuery(
    async () => {
      const repos = getRepos();
      const today = todayKey();
      const out: Record<string, { total: number; due: number }> = {};
      for (const d of await repos.decks.getAll()) {
        out[d.id] = { total: await repos.flashcards.countByDeck(d.id), due: await repos.flashcards.countDue(today, d.id) };
      }
      return out;
    },
    ["flashcard_decks", "flashcards", "flashcard_reviews"],
  );
  const { data: stats } = useRepoQuery(() => getRepos().reviews.dailyStats(14), ["flashcard_reviews"]);
  const totalDue = useMemo(() => Object.values(counts ?? {}).reduce((a, c) => a + c.due, 0), [counts]);

  return (
    <div>
      <PageHeader
        title={t("nav.flashcards")}
        actions={
          <>
            {totalDue > 0 && (
              <Button variant="secondary" asChild>
                <Link to="/flashcards/study">
                  <Play /> {t("flashcards.studyAll", { count: totalDue })}
                </Link>
              </Button>
            )}
            <Button onClick={() => setDialogOpen(true)} data-testid="deck-add">
              <Plus /> {t("flashcards.newDeck")}
            </Button>
          </>
        }
      />
      {(decks ?? []).length === 0 ? (
        <EmptyState icon={<Layers className="size-8" />} title={t("flashcards.emptyTitle")} description={t("flashcards.emptyHint")} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(decks ?? []).map((d) => {
            const c = counts?.[d.id];
            return (
              <Card key={d.id} className="flex flex-col" data-testid="deck-card">
                <CardHeader>
                  <CardTitle>
                    <Link to={`/flashcards/${d.id}`} className="hover:underline">
                      {d.name}
                    </Link>
                  </CardTitle>
                  <SubjectBadge subject={get(d.subject_id)} />
                </CardHeader>
                <CardContent className="mt-auto flex items-end justify-between gap-2">
                  <div className="text-sm text-muted-foreground">
                    <p>
                      <span className="text-2xl font-semibold text-foreground">{c?.due ?? 0}</span> {t("flashcards.due")}
                    </p>
                    <p>{t("flashcards.cardCount", { count: c?.total ?? 0 })}</p>
                  </div>
                  <Button size="sm" asChild disabled={!c?.due}>
                    <Link to={`/flashcards/${d.id}/study`} aria-label={`${t("flashcards.study")} ${d.name}`}>
                      <GraduationCap /> {t("flashcards.study")}
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
      {(stats ?? []).length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-sm">{t("flashcards.stats")}</CardTitle>
          </CardHeader>
          <CardContent>
            <StatsChart stats={stats ?? []} />
          </CardContent>
        </Card>
      )}
      {dialogOpen && <DeckDialog open={dialogOpen} onOpenChange={setDialogOpen} deck={null} />}
    </div>
  );
}
