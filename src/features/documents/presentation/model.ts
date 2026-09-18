import { newId } from "@/data/repository";

/**
 * Presentation stored in `documents.content_json` for `doc_type = 'presentation'`.
 * Coordinates are percentages of a 16:9 slide so the same data renders in
 * the editor, thumbnails, the presenter and the exports.
 */
export type SlideLayout = "title" | "titleContent" | "twoColumns" | "imageOnly" | "blank";
export type ElementKind = "text" | "image" | "shape";
export type ShapeKind = "rect" | "ellipse" | "line";
export type TextAlign = "left" | "center" | "right";

export interface SlideElement {
  id: string;
  kind: ElementKind;
  x: number; // % of width
  y: number; // % of height
  w: number; // % of width
  h: number; // % of height
  /** text */
  text?: string;
  fontSize?: number; // px at 960px slide width
  bold?: boolean;
  align?: TextAlign;
  color?: string;
  /** image */
  src?: string; // data URL
  /** shape */
  shape?: ShapeKind;
  fill?: string;
  stroke?: string;
}

export interface Slide {
  id: string;
  layout: SlideLayout;
  elements: SlideElement[];
  notes: string;
  background?: string;
}

export interface Presentation {
  version: 1;
  slides: Slide[];
}

export const SLIDE_WIDTH = 960;
export const SLIDE_HEIGHT = 540;

export function textElement(partial: Partial<SlideElement> & Pick<SlideElement, "x" | "y" | "w" | "h">): SlideElement {
  return { id: newId(), kind: "text", text: "", fontSize: 28, align: "left", color: "#1f2937", ...partial };
}

export function createSlide(layout: SlideLayout, labels: { title: string; subtitle: string; content: string; left: string; right: string; image: string }): Slide {
  const elements: SlideElement[] = [];
  switch (layout) {
    case "title":
      elements.push(textElement({ x: 8, y: 30, w: 84, h: 20, text: labels.title, fontSize: 54, bold: true, align: "center" }));
      elements.push(textElement({ x: 12, y: 54, w: 76, h: 12, text: labels.subtitle, fontSize: 28, align: "center", color: "#4b5563" }));
      break;
    case "titleContent":
      elements.push(textElement({ x: 6, y: 6, w: 88, h: 14, text: labels.title, fontSize: 40, bold: true }));
      elements.push(textElement({ x: 6, y: 24, w: 88, h: 68, text: labels.content, fontSize: 26 }));
      break;
    case "twoColumns":
      elements.push(textElement({ x: 6, y: 6, w: 88, h: 14, text: labels.title, fontSize: 40, bold: true }));
      elements.push(textElement({ x: 6, y: 24, w: 42, h: 68, text: labels.left, fontSize: 24 }));
      elements.push(textElement({ x: 52, y: 24, w: 42, h: 68, text: labels.right, fontSize: 24 }));
      break;
    case "imageOnly":
      elements.push({ id: newId(), kind: "shape", shape: "rect", x: 10, y: 10, w: 80, h: 80, fill: "#e5e7eb", stroke: "#9ca3af", text: labels.image });
      break;
    case "blank":
      break;
  }
  return { id: newId(), layout, elements, notes: "" };
}

export function emptyPresentation(labels: Parameters<typeof createSlide>[1]): Presentation {
  return { version: 1, slides: [createSlide("title", labels)] };
}

export function parsePresentation(json: string): Presentation | null {
  try {
    const p = JSON.parse(json) as Presentation;
    if (p && Array.isArray(p.slides)) return { version: 1, slides: p.slides.map((s) => ({ ...s, elements: s.elements ?? [], notes: s.notes ?? "" })) };
  } catch {
    /* fall through */
  }
  return null;
}

/** Lines of a text element (used by both renderers and exports). */
export function textLines(text: string | undefined): string[] {
  return (text ?? "").split(/\r?\n/);
}
