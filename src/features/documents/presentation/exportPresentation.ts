import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { Document as DocRow } from "@/data/types";
import { safeFileName, saveFileAs } from "@/platform/saveFile";
import { embedDataUrl } from "@/lib/pdf/richPdf";
import { wrap } from "@/lib/pdf/simplePdf";
import { parsePresentation, SLIDE_HEIGHT, SLIDE_WIDTH, textLines, type Presentation } from "./model";

function hexToRgb(hex: string | undefined, fallback: [number, number, number]): [number, number, number] {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex ?? "");
  if (!m) return fallback;
  const n = parseInt(m[1], 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

/** One PDF page per slide (960 × 540 pt, same proportions as the editor). */
export async function presentationToPdf(title: string, p: Presentation): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(title);
  doc.setCreator("StudyHub");
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  for (const slide of p.slides) {
    const page = doc.addPage([SLIDE_WIDTH, SLIDE_HEIGHT]);
    const [br, bg, bb] = hexToRgb(slide.background, [1, 1, 1]);
    page.drawRectangle({ x: 0, y: 0, width: SLIDE_WIDTH, height: SLIDE_HEIGHT, color: rgb(br, bg, bb) });
    for (const el of slide.elements) {
      const x = (el.x / 100) * SLIDE_WIDTH;
      const w = (el.w / 100) * SLIDE_WIDTH;
      const h = (el.h / 100) * SLIDE_HEIGHT;
      const top = SLIDE_HEIGHT - (el.y / 100) * SLIDE_HEIGHT;
      if (el.kind === "shape") {
        const [fr, fg, fb] = hexToRgb(el.fill, [0.86, 0.92, 1]);
        const [sr, sg, sb] = hexToRgb(el.stroke, [0.23, 0.51, 0.96]);
        if (el.shape === "line") page.drawLine({ start: { x, y: top - h / 2 }, end: { x: x + w, y: top - h / 2 }, thickness: 3, color: rgb(sr, sg, sb) });
        else if (el.shape === "ellipse") page.drawEllipse({ x: x + w / 2, y: top - h / 2, xScale: w / 2, yScale: h / 2, color: rgb(fr, fg, fb), borderColor: rgb(sr, sg, sb), borderWidth: 2 });
        else page.drawRectangle({ x, y: top - h, width: w, height: h, color: rgb(fr, fg, fb), borderColor: rgb(sr, sg, sb), borderWidth: 2 });
      }
      if (el.kind === "image" && el.src) {
        const img = await embedDataUrl(doc, el.src);
        if (img) {
          const scale = Math.min(w / img.width, h / img.height);
          const iw = img.width * scale;
          const ih = img.height * scale;
          page.drawImage(img, { x: x + (w - iw) / 2, y: top - h + (h - ih) / 2, width: iw, height: ih });
        }
      }
      if ((el.kind === "text" || el.kind === "shape") && el.text) {
        const size = el.fontSize ?? (el.kind === "shape" ? 20 : 28);
        const font = el.bold ? bold : regular;
        const [cr, cg, cb] = hexToRgb(el.color, [0.12, 0.16, 0.22]);
        const pad = 4;
        const lines = textLines(el.text).flatMap((l) => wrap(sanitize(l, font), font, size, w - 2 * pad));
        const lineHeight = size * 1.2;
        let y = top - pad - size;
        if (el.kind === "shape") y = top - h / 2 + (lines.length * lineHeight) / 2 - size;
        for (const line of lines) {
          if (y < top - h) break;
          const lw = font.widthOfTextAtSize(line, size);
          const align = el.kind === "shape" ? "center" : (el.align ?? "left");
          const lx = align === "center" ? x + (w - lw) / 2 : align === "right" ? x + w - pad - lw : x + pad;
          page.drawText(line, { x: lx, y, size, font, color: rgb(cr, cg, cb) });
          y -= lineHeight;
        }
      }
    }
  }
  return doc.save();
}

function sanitize(text: string, font: { encodeText: (s: string) => unknown }): string {
  let out = "";
  for (const ch of text) {
    try {
      font.encodeText(ch);
      out += ch;
    } catch {
      out += "?";
    }
  }
  return out;
}

/** PPTX via pptxgenjs: text boxes, images, shapes and speaker notes. */
export async function presentationToPptx(title: string, p: Presentation): Promise<Uint8Array> {
  const mod = await import("pptxgenjs");
  const PptxGenJS = (mod.default ?? mod) as unknown as new () => import("pptxgenjs").default;
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_16x9"; // 10 × 5.625 in
  pptx.title = title;
  const W = 10;
  const H = 5.625;
  const inch = (pct: number, total: number) => (pct / 100) * total;
  for (const slide of p.slides) {
    const s = pptx.addSlide();
    if (slide.background) s.background = { color: slide.background.replace("#", "") };
    for (const el of slide.elements) {
      const box = { x: inch(el.x, W), y: inch(el.y, H), w: inch(el.w, W), h: inch(el.h, H) };
      if (el.kind === "shape") {
        const shape = el.shape === "ellipse" ? pptx.ShapeType.ellipse : el.shape === "line" ? pptx.ShapeType.line : pptx.ShapeType.rect;
        const opts = el.shape === "line" ? { ...box, h: 0, line: { color: (el.stroke ?? "#374151").replace("#", ""), width: 2 } } : { ...box, fill: { color: (el.fill ?? "#dbeafe").replace("#", "") }, line: { color: (el.stroke ?? "#3b82f6").replace("#", ""), width: 1 } };
        if (el.text && el.shape !== "line") s.addText(el.text, { ...opts, shape, fontSize: ptSize(el.fontSize ?? 20), color: (el.color ?? "#1f2937").replace("#", ""), align: "center", valign: "middle" });
        else s.addShape(shape, opts);
      } else if (el.kind === "image" && el.src) {
        s.addImage({ data: el.src, ...box, sizing: { type: "contain", w: box.w, h: box.h } });
      } else if (el.kind === "text") {
        s.addText(el.text ?? "", { ...box, fontSize: ptSize(el.fontSize ?? 28), bold: !!el.bold, align: el.align ?? "left", valign: "top", color: (el.color ?? "#1f2937").replace("#", ""), margin: 4 });
      }
    }
    if (slide.notes) s.addNotes(slide.notes);
  }
  const out = (await pptx.write({ outputType: "uint8array" })) as Uint8Array;
  return out;
}

/** Editor font size is px at 960 px width; 10 in slide → 96 px per inch → 1 px = 0.75 pt. */
function ptSize(px: number): number {
  return Math.round(px * 0.75);
}

export async function exportPresentation(row: DocRow, format: "pdf" | "pptx"): Promise<string | null> {
  const p = parsePresentation(row.content_json);
  if (!p) throw new Error("Invalid presentation");
  const name = safeFileName(row.title, "presentation");
  if (format === "pdf") {
    const bytes = await presentationToPdf(row.title, p);
    return saveFileAs(bytes, { suggestedName: `${name}.pdf`, extensions: ["pdf"], filterName: "PDF", mimeType: "application/pdf" });
  }
  const bytes = await presentationToPptx(row.title, p);
  return saveFileAs(bytes, { suggestedName: `${name}.pptx`, extensions: ["pptx"], filterName: "PowerPoint", mimeType: "application/vnd.openxmlformats-officedocument.presentationml.presentation" });
}
