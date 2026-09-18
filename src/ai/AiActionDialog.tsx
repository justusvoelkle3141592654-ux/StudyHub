import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Loader2, Send, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MarkdownPreview } from "@/features/notes/MarkdownPreview";
import { describeAiError } from "./aiService";
import { getAiModel } from "./aiStore";

type Phase = "preview" | "running" | "done" | "error";

/**
 * Generic AI action dialog. Before anything is sent the user sees exactly
 * which content goes to the provider; the request can be cancelled while
 * it runs; the result can then be applied by the caller.
 */
export function AiActionDialog({
  open,
  onOpenChange,
  title,
  contentToSend,
  run,
  renderResult,
  applyLabel,
  onApply,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  /** Text that will be sent (shown verbatim in the preview). */
  contentToSend: string;
  /** Executes the request; `onDelta` streams partial text for display, `signal` cancels. */
  run: (onDelta: (text: string) => void, signal: AbortSignal) => Promise<unknown>;
  /** Renders the final result (default: Markdown of the streamed text). */
  renderResult?: (result: unknown) => React.ReactNode;
  applyLabel?: string;
  onApply?: (result: unknown) => void | Promise<void>;
}) {
  const { t } = useTranslation();
  const [phase, setPhase] = useState<Phase>("preview");
  const [streamed, setStreamed] = useState("");
  const [result, setResult] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);
  const abort = useRef<AbortController | null>(null);

  useEffect(() => {
    if (open) {
      setPhase("preview");
      setStreamed("");
      setResult(null);
      setError(null);
    } else abort.current?.abort();
  }, [open]);

  const start = async () => {
    const controller = new AbortController();
    abort.current = controller;
    setPhase("running");
    setStreamed("");
    try {
      const res = await run((delta) => setStreamed((s) => s + delta), controller.signal);
      setResult(res);
      setPhase("done");
    } catch (e) {
      if (controller.signal.aborted) {
        setPhase("preview");
        return;
      }
      const d = describeAiError(e);
      setError(`${t(d.key)}${d.detail ? ` (${d.detail})` : ""}`);
      setPhase("error");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary" /> {title}
          </DialogTitle>
          <DialogDescription>{phase === "preview" ? t("ai.previewHint", { model: getAiModel() }) : t("ai.privacyShort")}</DialogDescription>
        </DialogHeader>
        {phase === "preview" && (
          <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-md border bg-muted/40 p-3 text-xs" data-testid="ai-preview">
            {contentToSend}
          </pre>
        )}
        {phase === "running" && (
          <div className="max-h-80 overflow-auto rounded-md border p-3" aria-live="polite" data-testid="ai-streaming">
            {streamed ? <MarkdownPreview markdown={streamed} /> : <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" /> {t("ai.working")}</p>}
          </div>
        )}
        {phase === "done" && (
          <div className="max-h-80 overflow-auto rounded-md border p-3" data-testid="ai-result">
            {renderResult?.(result) ?? <MarkdownPreview markdown={String(result ?? "")} />}
          </div>
        )}
        {phase === "error" && (
          <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </p>
        )}
        <DialogFooter>
          {phase === "running" ? (
            <Button variant="outline" onClick={() => abort.current?.abort()} data-testid="ai-abort">
              <X /> {t("ai.abort")}
            </Button>
          ) : (
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {t("common.close")}
            </Button>
          )}
          {(phase === "preview" || phase === "error") && (
            <Button onClick={() => void start()} data-testid="ai-send">
              <Send /> {t("ai.send")}
            </Button>
          )}
          {phase === "done" && onApply && (
            <Button
              onClick={async () => {
                await onApply(result);
                onOpenChange(false);
              }}
              data-testid="ai-apply"
            >
              {applyLabel ?? t("ai.apply")}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
