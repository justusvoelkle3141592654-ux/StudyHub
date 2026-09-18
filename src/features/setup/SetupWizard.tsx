import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useSetupStore } from "./setupStore";
import { applySetup, buildDraftFromSettings } from "./applySetup";
import { createDefaultDraft, WIZARD_STEP_COUNT } from "./types";
import { useUiStore } from "@/stores/uiStore";
import { useAppStore } from "@/stores/appStore";
import { log } from "@/lib/logger";
import { Step01Welcome } from "./steps/Step01Welcome";
import { Step02Profile } from "./steps/Step02Profile";
import { Step03Mode } from "./steps/Step03Mode";
import { Step04Account } from "./steps/Step04Account";
import { Step05Database } from "./steps/Step05Database";
import { Step06WorkingFolder } from "./steps/Step06WorkingFolder";
import { Step07Subjects } from "./steps/Step07Subjects";
import { Step08Timetable } from "./steps/Step08Timetable";
import { Step09Grades } from "./steps/Step09Grades";
import { Step10Flashcards } from "./steps/Step10Flashcards";
import { Step11Notifications } from "./steps/Step11Notifications";
import { Step12Ai } from "./steps/Step12Ai";
import { Step13Appearance } from "./steps/Step13Appearance";
import { Step14Import } from "./steps/Step14Import";
import { Step15Summary } from "./steps/Step15Summary";
import { getPlatform, isDesktopPlatform, type PlatformKind } from "@/platform";

const STEPS = [
  Step01Welcome,
  Step02Profile,
  Step03Mode,
  Step04Account,
  Step05Database,
  Step06WorkingFolder,
  Step07Subjects,
  Step08Timetable,
  Step09Grades,
  Step10Flashcards,
  Step11Notifications,
  Step12Ai,
  Step13Appearance,
  Step14Import,
  Step15Summary,
];

/** Steps that only apply to desktop platforms (database path, working folder). */
const DESKTOP_ONLY_STEPS = new Set([5, 6]);

/**
 * 15-step first-run wizard. All inputs stay in the in-memory draft until the
 * last step; only "Finish" persists anything.
 */
export function SetupWizard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { step, setStep, next, back, saving, setSaving, error, setError, reset } = useSetupStore();
  const draft = useSetupStore((s) => s.draft);
  const setupCompleted = useAppStore((s) => s.setupCompleted);
  const [platform, setPlatform] = useState<PlatformKind>("browser");

  useEffect(() => {
    void getPlatform().then(setPlatform);
    if (!setupCompleted) reset(createDefaultDraft(useUiStore.getState().language));
    else void buildDraftFromSettings().then((d) => reset(d));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const skipStep = (s: number) => DESKTOP_ONLY_STEPS.has(s) && !isDesktopPlatform(platform) && platform !== "browser";
  const goNext = () => next(skipStep);
  const goBack = () => back(skipStep);

  const finish = async () => {
    setSaving(true);
    setError(null);
    try {
      await applySetup(draft);
      toast.success(t("setup.done"));
      navigate("/", { replace: true });
    } catch (e) {
      log.error("setup", "applySetup failed", e);
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  /** "Set up later": keep sensible defaults for the remaining steps and finish. */
  const skipToEnd = () => setStep(WIZARD_STEP_COUNT);

  const StepComponent = STEPS[step - 1];
  const percent = useMemo(() => Math.round(((step - 1) / (WIZARD_STEP_COUNT - 1)) * 100), [step]);
  const isLast = step === WIZARD_STEP_COUNT;

  return (
    <div className="flex min-h-dvh flex-col bg-muted/30">
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 py-6 md:py-10">
        <header className="mb-6">
          <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
            <span className="font-medium text-foreground">{t("app.name")} · {t("setup.title")}</span>
            <span aria-live="polite" data-testid="setup-step-indicator">
              {t("setup.stepOf", { current: step, total: WIZARD_STEP_COUNT })}
            </span>
          </div>
          <Progress value={percent} aria-label={t("setup.progress")} />
        </header>

        <div className="flex-1 rounded-xl border bg-background p-5 shadow-xs md:p-8" data-testid={`setup-step-${step}`}>
          <StepComponent />
          {error && (
            <p role="alert" className="mt-4 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              {t("setup.failed")}: {error}
            </p>
          )}
        </div>

        <footer className="mt-4 flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={goBack} disabled={step === 1 || saving} data-testid="setup-back">
            <ArrowLeft /> {t("common.back")}
          </Button>
          {!isLast && (
            <Button variant="ghost" onClick={skipToEnd} disabled={saving} data-testid="setup-skip">
              {t("common.skip")}
            </Button>
          )}
          <div className="flex-1" />
          {isLast ? (
            <Button onClick={() => void finish()} disabled={saving} data-testid="setup-finish">
              {saving ? <Loader2 className="animate-spin" /> : <Check />} {t("setup.finish")}
            </Button>
          ) : (
            <Button onClick={goNext} disabled={saving} data-testid="setup-next">
              {t("common.next")} <ArrowRight />
            </Button>
          )}
        </footer>
      </div>
    </div>
  );
}
