import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SLIDE_HEIGHT, SLIDE_WIDTH, type Presentation } from "./model";
import { SlideCanvas } from "./SlideCanvas";

/** Fullscreen presentation mode: arrows / space / click advance, Escape exits. */
export function Presenter({ presentation, start = 0, onExit }: { presentation: Presentation; start?: number; onExit: () => void }) {
  const { t } = useTranslation();
  const [index, setIndex] = useState(start);
  const [size, setSize] = useState({ w: 960, h: 540 });
  const ref = useRef<HTMLDivElement>(null);
  const total = presentation.slides.length;

  const next = useCallback(() => setIndex((i) => Math.min(total - 1, i + 1)), [total]);
  const prev = useCallback(() => setIndex((i) => Math.max(0, i - 1)), []);

  useEffect(() => {
    const el = ref.current;
    if (el && document.fullscreenEnabled && !document.fullscreenElement) el.requestFullscreen?.().catch(() => undefined);
    const measure = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const scale = Math.min(w / SLIDE_WIDTH, h / SLIDE_HEIGHT);
      setSize({ w: SLIDE_WIDTH * scale, h: SLIDE_HEIGHT * scale });
    };
    measure();
    window.addEventListener("resize", measure);
    const onKey = (e: KeyboardEvent) => {
      if (["ArrowRight", " ", "PageDown", "Enter"].includes(e.key)) {
        e.preventDefault();
        next();
      } else if (["ArrowLeft", "PageUp", "Backspace"].includes(e.key)) {
        e.preventDefault();
        prev();
      } else if (e.key === "Escape") onExit();
    };
    window.addEventListener("keydown", onKey);
    const onFs = () => {
      if (!document.fullscreenElement) onExit();
    };
    document.addEventListener("fullscreenchange", onFs);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("fullscreenchange", onFs);
      if (document.fullscreenElement) document.exitFullscreen?.().catch(() => undefined);
    };
  }, [next, prev, onExit]);

  const slide = presentation.slides[index];
  return (
    <div ref={ref} className="fixed inset-0 z-50 flex items-center justify-center bg-black" onClick={next} data-testid="presenter" role="application" aria-label={t("documents.presentMode")}>
      {slide && <SlideCanvas slide={slide} width={size.w} />}
      <div className="absolute bottom-3 right-3 flex items-center gap-1 rounded-md bg-black/60 p-1 text-white" onClick={(e) => e.stopPropagation()}>
        <Button variant="ghost" size="icon-sm" className="text-white hover:bg-white/20" aria-label={t("common.back")} onClick={prev} disabled={index === 0}>
          <ChevronLeft />
        </Button>
        <span className="px-1 text-xs tabular-nums" data-testid="presenter-index">
          {index + 1} / {total}
        </span>
        <Button variant="ghost" size="icon-sm" className="text-white hover:bg-white/20" aria-label={t("common.next")} onClick={next} disabled={index >= total - 1}>
          <ChevronRight />
        </Button>
        <Button variant="ghost" size="icon-sm" className="text-white hover:bg-white/20" aria-label={t("common.close")} onClick={onExit}>
          <X />
        </Button>
      </div>
    </div>
  );
}
