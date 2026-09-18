import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowDown, ArrowUp, Circle, Copy, Download, ImagePlus, Minus, Play, Plus, Square, Trash2, Type } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { getRepos } from "@/data/db";
import type { Document as DocRow } from "@/data/types";
import { newId } from "@/data/repository";
import { reportError } from "@/lib/logger";
import { formatDateTime } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { pickImageAsDataUrl } from "@/platform/images";
import { createSlide, emptyPresentation, parsePresentation, SLIDE_HEIGHT, SLIDE_WIDTH, textElement, type Presentation, type Slide, type SlideElement, type SlideLayout, type TextAlign } from "./model";
import { SlideCanvas } from "./SlideCanvas";
import { Presenter } from "./Presenter";
import { exportPresentation } from "./exportPresentation";

const LAYOUTS: SlideLayout[] = ["title", "titleContent", "twoColumns", "imageOnly", "blank"];

/** Slide list left, canvas + properties right, speaker notes below. */
export function PresentationEditor({ row }: { row: DocRow }) {
  const { t } = useTranslation();
  const labels = { title: t("documents.ph.title"), subtitle: t("documents.ph.subtitle"), content: t("documents.ph.content"), left: t("documents.ph.left"), right: t("documents.ph.right"), image: t("documents.ph.image") };
  const [pres, setPres] = useState<Presentation>(() => parsePresentation(row.content_json) ?? emptyPresentation(labels));
  const [current, setCurrent] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [presenting, setPresenting] = useState(false);
  const [savedAt, setSavedAt] = useState(row.updated_at);
  const [dirty, setDirty] = useState(false);
  const [canvasWidth, setCanvasWidth] = useState(640);
  const canvasHost = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef(pres);
  latest.current = pres;

  const persist = useCallback(async () => {
    try {
      const updated = await getRepos().documents.update(row.id, { content_json: JSON.stringify(latest.current) });
      setSavedAt(updated.updated_at);
      setDirty(false);
    } catch (e) {
      toast.error(t("common.errorGeneric"), { description: reportError("documents", "autosave failed", e) });
    }
  }, [row.id, t]);

  const update = (fn: (p: Presentation) => Presentation) => {
    setPres((p) => {
      const next = fn(p);
      latest.current = next;
      return next;
    });
    setDirty(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void persist(), 700);
  };
  useEffect(
    () => () => {
      if (timer.current) {
        clearTimeout(timer.current);
        void persist();
      }
    },
    [persist],
  );

  useEffect(() => {
    const el = canvasHost.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setCanvasWidth(Math.max(320, Math.min(el.clientWidth - 8, 960))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const slide = pres.slides[current] ?? pres.slides[0];
  const selected = slide?.elements.find((e) => e.id === selectedId) ?? null;

  const updateSlide = (fn: (s: Slide) => Slide) => update((p) => ({ ...p, slides: p.slides.map((s, i) => (i === current ? fn(s) : s)) }));
  const updateElement = (id: string, patch: Partial<SlideElement>) => updateSlide((s) => ({ ...s, elements: s.elements.map((e) => (e.id === id ? { ...e, ...patch } : e)) }));

  const addSlide = (layout: SlideLayout) => {
    update((p) => {
      const slides = [...p.slides];
      slides.splice(current + 1, 0, createSlide(layout, labels));
      return { ...p, slides };
    });
    setCurrent((c) => c + 1);
    setSelectedId(null);
  };
  const deleteSlide = () => {
    if (pres.slides.length <= 1) return;
    update((p) => ({ ...p, slides: p.slides.filter((_, i) => i !== current) }));
    setCurrent((c) => Math.max(0, c - 1));
    setSelectedId(null);
  };
  const duplicateSlide = () => {
    update((p) => {
      const copy: Slide = { ...slide, id: newId(), elements: slide.elements.map((e) => ({ ...e, id: newId() })) };
      const slides = [...p.slides];
      slides.splice(current + 1, 0, copy);
      return { ...p, slides };
    });
    setCurrent((c) => c + 1);
  };
  const moveSlide = (dir: -1 | 1) => {
    const target = current + dir;
    if (target < 0 || target >= pres.slides.length) return;
    update((p) => {
      const slides = [...p.slides];
      [slides[current], slides[target]] = [slides[target], slides[current]];
      return { ...p, slides };
    });
    setCurrent(target);
  };

  const addText = () => {
    const el = textElement({ x: 10, y: 40, w: 60, h: 15, text: t("documents.ph.text") });
    updateSlide((s) => ({ ...s, elements: [...s.elements, el] }));
    setSelectedId(el.id);
  };
  const addShape = (shape: "rect" | "ellipse" | "line") => {
    const el: SlideElement = { id: newId(), kind: "shape", shape, x: 30, y: 30, w: 30, h: shape === "line" ? 4 : 25, fill: "#dbeafe", stroke: "#3b82f6" };
    updateSlide((s) => ({ ...s, elements: [...s.elements, el] }));
    setSelectedId(el.id);
  };
  const addImage = async () => {
    try {
      const src = await pickImageAsDataUrl();
      if (!src) return;
      const el: SlideElement = { id: newId(), kind: "image", src, x: 25, y: 20, w: 50, h: 60 };
      updateSlide((s) => ({ ...s, elements: [...s.elements, el] }));
      setSelectedId(el.id);
    } catch (e) {
      toast.error(t("common.errorGeneric"), { description: reportError("documents", "image failed", e) });
    }
  };
  const removeElement = () => {
    if (!selected) return;
    updateSlide((s) => ({ ...s, elements: s.elements.filter((e) => e.id !== selected.id) }));
    setSelectedId(null);
  };

  // Drag to move / resize (pointer events; deltas converted to % of the slide).
  const drag = useRef<{ id: string; mode: "move" | "resize"; startX: number; startY: number; el: SlideElement } | null>(null);
  const onPointerDownElement = (el: SlideElement, e: React.PointerEvent) => {
    setSelectedId(el.id);
    drag.current = { id: el.id, mode: "move", startX: e.clientX, startY: e.clientY, el };
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  };
  const onPointerDownResize = (el: SlideElement, e: React.PointerEvent) => {
    drag.current = { id: el.id, mode: "resize", startX: e.clientX, startY: e.clientY, el };
  };
  useEffect(() => {
    const move = (e: PointerEvent) => {
      const d = drag.current;
      if (!d) return;
      const dx = ((e.clientX - d.startX) / canvasWidth) * 100;
      const dy = ((e.clientY - d.startY) / ((canvasWidth * SLIDE_HEIGHT) / SLIDE_WIDTH)) * 100;
      if (d.mode === "move") {
        setPres((p) => ({ ...p, slides: p.slides.map((s, i) => (i === current ? { ...s, elements: s.elements.map((el) => (el.id === d.id ? { ...el, x: clamp(d.el.x + dx, -50, 100), y: clamp(d.el.y + dy, -50, 100) } : el)) } : s)) }));
      } else {
        setPres((p) => ({ ...p, slides: p.slides.map((s, i) => (i === current ? { ...s, elements: s.elements.map((el) => (el.id === d.id ? { ...el, w: Math.max(4, d.el.w + dx), h: Math.max(3, d.el.h + dy) } : el)) } : s)) }));
      }
    };
    const up = () => {
      if (!drag.current) return;
      drag.current = null;
      update((p) => p);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvasWidth, current]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if ((e.key === "Delete" || e.key === "Backspace") && selected) {
        e.preventDefault();
        removeElement();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  const doExport = async (format: "pdf" | "pptx") => {
    try {
      await persist();
      const fresh = (await getRepos().documents.getById(row.id)) ?? row;
      const path = await exportPresentation(fresh, format);
      if (path) toast.success(t("notes.exported", { path }));
    } catch (e) {
      toast.error(t("common.errorGeneric"), { description: reportError("documents", "export failed", e) });
    }
  };

  if (!slide) return null;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-wrap items-center gap-1 border-b p-1" role="toolbar" aria-label={t("documents.toolbar")}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" data-testid="slide-add">
              <Plus /> {t("documents.newSlide")}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {LAYOUTS.map((l) => (
              <DropdownMenuItem key={l} onSelect={() => addSlide(l)} data-testid={`layout-${l}`}>
                {t(`documents.layout.${l}`)}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <Button variant="ghost" size="sm" onClick={addText}><Type /> {t("documents.textBox")}</Button>
        <Button variant="ghost" size="sm" onClick={() => void addImage()}><ImagePlus /> {t("documents.image")}</Button>
        <Button variant="ghost" size="icon-sm" aria-label={t("documents.shapeRect")} onClick={() => addShape("rect")}><Square /></Button>
        <Button variant="ghost" size="icon-sm" aria-label={t("documents.shapeEllipse")} onClick={() => addShape("ellipse")}><Circle /></Button>
        <Button variant="ghost" size="icon-sm" aria-label={t("documents.shapeLine")} onClick={() => addShape("line")}><Minus /></Button>
        <div className="flex-1" />
        <Button variant="secondary" size="sm" onClick={() => setPresenting(true)} data-testid="present">
          <Play /> {t("documents.present")}
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm"><Download /> {t("notes.export")}</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => void doExport("pdf")}>PDF</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => void doExport("pptx")}>PowerPoint (.pptx)</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="flex min-h-0 flex-1">
        <aside className="flex w-44 shrink-0 flex-col gap-2 overflow-y-auto border-r p-2" aria-label={t("documents.slides")}>
          {pres.slides.map((s, i) => (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                setCurrent(i);
                setSelectedId(null);
              }}
              aria-current={i === current ? "true" : undefined}
              className={cn("rounded-md border p-1 text-left ring-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", i === current && "border-primary ring-2 ring-primary/40")}
              data-testid="slide-thumb"
            >
              <span className="mb-1 block text-[10px] text-muted-foreground">{i + 1}</span>
              <SlideCanvas slide={s} width={150} />
            </button>
          ))}
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">
          <div ref={canvasHost} className="flex min-h-0 flex-1 items-start justify-center overflow-auto bg-muted/40 p-4">
            <SlideCanvas slide={slide} width={canvasWidth} selectedId={selectedId} onPointerDownElement={onPointerDownElement} onPointerDownResize={onPointerDownResize} onBackgroundClick={() => setSelectedId(null)} className="rounded-sm" />
          </div>
          <div className="border-t p-2">
            <Label htmlFor="notes" className="text-xs text-muted-foreground">{t("documents.notes")}</Label>
            <Textarea id="notes" value={slide.notes} onChange={(e) => updateSlide((s) => ({ ...s, notes: e.target.value }))} rows={2} className="mt-1 resize-none" data-testid="slide-notes" />
          </div>
        </div>
        <aside className="hidden w-60 shrink-0 flex-col gap-3 overflow-y-auto border-l p-3 text-sm lg:flex" aria-label={t("documents.properties")}>
          <div className="flex flex-wrap gap-1">
            <Button variant="outline" size="icon-sm" aria-label={t("documents.slideUp")} onClick={() => moveSlide(-1)} disabled={current === 0}><ArrowUp /></Button>
            <Button variant="outline" size="icon-sm" aria-label={t("documents.slideDown")} onClick={() => moveSlide(1)} disabled={current >= pres.slides.length - 1}><ArrowDown /></Button>
            <Button variant="outline" size="icon-sm" aria-label={t("documents.duplicateSlide")} onClick={duplicateSlide}><Copy /></Button>
            <Button variant="outline" size="icon-sm" aria-label={t("documents.deleteSlide")} onClick={deleteSlide} disabled={pres.slides.length <= 1}><Trash2 /></Button>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bg">{t("documents.background")}</Label>
            <input id="bg" type="color" value={slide.background ?? "#ffffff"} onChange={(e) => updateSlide((s) => ({ ...s, background: e.target.value }))} className="h-8 w-full cursor-pointer" />
          </div>
          {selected ? (
            <>
              <p className="font-medium">{t(`documents.element.${selected.kind}`)}</p>
              {(selected.kind === "text" || (selected.kind === "shape" && selected.shape !== "line")) && (
                <div className="space-y-1.5">
                  <Label htmlFor="el-text">{t("documents.text")}</Label>
                  <Textarea id="el-text" value={selected.text ?? ""} onChange={(e) => updateElement(selected.id, { text: e.target.value })} rows={4} data-testid="element-text" />
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label htmlFor="el-size" className="text-xs">{t("documents.fontSize")}</Label>
                      <Input id="el-size" type="number" min={8} max={120} value={selected.fontSize ?? 28} onChange={(e) => updateElement(selected.id, { fontSize: Number(e.target.value) || 28 })} />
                    </div>
                    <div>
                      <Label htmlFor="el-color" className="text-xs">{t("documents.textColor")}</Label>
                      <input id="el-color" type="color" value={selected.color ?? "#1f2937"} onChange={(e) => updateElement(selected.id, { color: e.target.value })} className="h-9 w-full cursor-pointer" />
                    </div>
                  </div>
                  {selected.kind === "text" && (
                    <div className="grid grid-cols-2 gap-2">
                      <Select value={selected.align ?? "left"} onValueChange={(v) => updateElement(selected.id, { align: v as TextAlign })}>
                        <SelectTrigger aria-label={t("documents.align")}><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="left">{t("documents.alignLeft")}</SelectItem>
                          <SelectItem value="center">{t("documents.alignCenter")}</SelectItem>
                          <SelectItem value="right">{t("documents.alignRight")}</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button variant={selected.bold ? "secondary" : "outline"} size="sm" onClick={() => updateElement(selected.id, { bold: !selected.bold })} aria-pressed={!!selected.bold}>
                        {t("documents.bold")}
                      </Button>
                    </div>
                  )}
                </div>
              )}
              {selected.kind === "shape" && (
                <div className="grid grid-cols-2 gap-2">
                  {selected.shape !== "line" && (
                    <div>
                      <Label htmlFor="el-fill" className="text-xs">{t("documents.fill")}</Label>
                      <input id="el-fill" type="color" value={selected.fill ?? "#dbeafe"} onChange={(e) => updateElement(selected.id, { fill: e.target.value })} className="h-9 w-full cursor-pointer" />
                    </div>
                  )}
                  <div>
                    <Label htmlFor="el-stroke" className="text-xs">{t("documents.stroke")}</Label>
                    <input id="el-stroke" type="color" value={selected.stroke ?? "#3b82f6"} onChange={(e) => updateElement(selected.id, { stroke: e.target.value })} className="h-9 w-full cursor-pointer" />
                  </div>
                </div>
              )}
              <div className="grid grid-cols-4 gap-1 text-xs">
                {(["x", "y", "w", "h"] as const).map((k) => (
                  <div key={k}>
                    <Label htmlFor={`el-${k}`} className="text-xs uppercase">{k}</Label>
                    <Input id={`el-${k}`} type="number" value={Math.round(selected[k])} onChange={(e) => updateElement(selected.id, { [k]: Number(e.target.value) || 0 })} />
                  </div>
                ))}
              </div>
              <Button variant="outline" size="sm" className="text-destructive" onClick={removeElement}>
                <Trash2 /> {t("documents.removeElement")}
              </Button>
            </>
          ) : (
            <p className="text-xs text-muted-foreground">{t("documents.selectHint")}</p>
          )}
        </aside>
      </div>
      <div className="flex items-center gap-3 border-t px-3 py-1 text-xs text-muted-foreground" aria-live="polite">
        <span>{t("documents.slideOf", { current: current + 1, total: pres.slides.length })}</span>
        <span className="ml-auto">{dirty ? t("notes.saving") : t("notes.savedAt", { time: formatDateTime(savedAt) })}</span>
      </div>
      {presenting && <Presenter presentation={pres} start={current} onExit={() => setPresenting(false)} />}
    </div>
  );
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}
