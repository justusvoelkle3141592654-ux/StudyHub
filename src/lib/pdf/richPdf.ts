import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFImage } from "pdf-lib";
import { wrap } from "./simplePdf";
import type { FlatBlock, TextRunSpec } from "@/features/documents/text/docModel";

/**
 * Plain PDF renderer for office text documents: headings, paragraphs,
 * lists, quotes, code, tables (text grid), images (PNG/JPEG), page breaks
 * and footnotes at the end. A4, Helvetica. Deliberately simple.
 */
const PAGE = { width: 595.28, height: 841.89 };
const MARGIN = 56;

export async function renderRichPdf(title: string, blocks: FlatBlock[], footnotes: string[]): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(title);
  doc.setCreator("StudyHub");
  const fonts = {
    regular: await doc.embedFont(StandardFonts.Helvetica),
    bold: await doc.embedFont(StandardFonts.HelveticaBold),
    italic: await doc.embedFont(StandardFonts.HelveticaOblique),
    boldItalic: await doc.embedFont(StandardFonts.HelveticaBoldOblique),
    mono: await doc.embedFont(StandardFonts.Courier),
  };
  let page = doc.addPage([PAGE.width, PAGE.height]);
  let y = PAGE.height - MARGIN;
  const maxWidth = PAGE.width - 2 * MARGIN;

  const newPage = () => {
    page = doc.addPage([PAGE.width, PAGE.height]);
    y = PAGE.height - MARGIN;
  };
  const ensure = (needed: number) => {
    if (y - needed < MARGIN) newPage();
  };
  const fontFor = (r: TextRunSpec): PDFFont => (r.code ? fonts.mono : r.bold && r.italic ? fonts.boldItalic : r.bold ? fonts.bold : r.italic ? fonts.italic : fonts.regular);

  /** Draw runs with word wrapping, honouring per-run fonts. */
  const drawRuns = (runs: TextRunSpec[], size: number, indent = 0, color = rgb(0.1, 0.1, 0.1), prefix?: string) => {
    const lineHeight = size * 1.4;
    type Word = { text: string; font: PDFFont; width: number; underline?: boolean; strike?: boolean };
    const lines: Word[][] = [[]];
    let lineWidth = 0;
    const available = maxWidth - indent;
    const pushWord = (w: Word) => {
      if (lineWidth + w.width > available && lines[lines.length - 1].length) {
        lines.push([]);
        lineWidth = 0;
      }
      lines[lines.length - 1].push(w);
      lineWidth += w.width;
    };
    if (prefix) pushWord({ text: prefix, font: fonts.regular, width: fonts.regular.widthOfTextAtSize(prefix, size) });
    for (const r of runs) {
      if (r.break) {
        lines.push([]);
        lineWidth = 0;
        continue;
      }
      const font = fontFor(r);
      const text = r.footnote ? `[${r.footnote}]` : sanitize(r.text, font);
      const parts = text.split(/(\s+)/);
      for (const p of parts) {
        if (!p) continue;
        const width = font.widthOfTextAtSize(p, size);
        if (width > available) {
          for (const piece of wrap(p, font, size, available)) pushWord({ text: piece, font, width: font.widthOfTextAtSize(piece, size), underline: r.underline, strike: r.strike });
        } else pushWord({ text: p, font, width, underline: r.underline, strike: r.strike });
      }
    }
    for (const line of lines) {
      ensure(lineHeight);
      let x = MARGIN + indent;
      for (const w of line) {
        if (x === MARGIN + indent && /^\s+$/.test(w.text)) continue;
        page.drawText(w.text, { x, y: y - size, size, font: w.font, color });
        if (w.underline) page.drawLine({ start: { x, y: y - size - 1.5 }, end: { x: x + w.width, y: y - size - 1.5 }, thickness: 0.6, color });
        if (w.strike) page.drawLine({ start: { x, y: y - size * 0.65 }, end: { x: x + w.width, y: y - size * 0.65 }, thickness: 0.6, color });
        x += w.width;
      }
      y -= lineHeight;
    }
  };

  drawRuns([{ text: title, bold: true }], 20);
  y -= 10;

  for (const b of blocks) {
    switch (b.kind) {
      case "heading": {
        const size = b.level === 1 ? 16 : b.level === 2 ? 13.5 : 12;
        y -= 6;
        drawRuns((b.runs ?? []).map((r) => ({ ...r, bold: true })), size);
        y -= 2;
        break;
      }
      case "paragraph":
        drawRuns(b.runs ?? [], 11);
        y -= 4;
        break;
      case "listItem":
        drawRuns(b.runs ?? [], 11, 12 + ((b.level ?? 1) - 1) * 14, undefined, b.ordered ? `${b.index ?? 1}. ` : "- ");
        break;
      case "quote":
        drawRuns((b.runs ?? []).map((r) => ({ ...r, italic: true })), 11, 14, rgb(0.35, 0.35, 0.35));
        y -= 4;
        break;
      case "code":
        for (const line of (b.text ?? "").split("\n")) drawRuns([{ text: line || " ", code: true }], 9.5, 8, rgb(0.25, 0.25, 0.25));
        y -= 4;
        break;
      case "rule":
        ensure(12);
        page.drawLine({ start: { x: MARGIN, y: y - 4 }, end: { x: PAGE.width - MARGIN, y: y - 4 }, thickness: 0.5, color: rgb(0.6, 0.6, 0.6) });
        y -= 12;
        break;
      case "pageBreak":
        newPage();
        break;
      case "image": {
        const img = await embedDataUrl(doc, b.src ?? "");
        if (!img) break;
        const scale = Math.min(1, maxWidth / img.width, (PAGE.height - 2 * MARGIN) / img.height);
        const w = img.width * scale;
        const h = img.height * scale;
        ensure(h + 8);
        page.drawImage(img, { x: MARGIN, y: y - h, width: w, height: h });
        y -= h + 8;
        break;
      }
      case "table": {
        const rows = b.rows ?? [];
        if (!rows.length) break;
        const cols = Math.max(...rows.map((r) => r.length));
        const colW = maxWidth / cols;
        const size = 10;
        for (const [ri, row] of rows.entries()) {
          const cellLines = row.map((cell) => wrap(cell.map((r) => (r.break ? "\n" : sanitize(r.text, fonts.regular))).join(""), fonts.regular, size, colW - 8));
          const rowH = Math.max(1, ...cellLines.map((l) => l.length)) * size * 1.3 + 6;
          ensure(rowH);
          for (let ci = 0; ci < cols; ci++) {
            const x = MARGIN + ci * colW;
            page.drawRectangle({ x, y: y - rowH, width: colW, height: rowH, borderColor: rgb(0.7, 0.7, 0.7), borderWidth: 0.5 });
            const font = ri === 0 ? fonts.bold : fonts.regular;
            (cellLines[ci] ?? []).forEach((line, li) => page.drawText(line, { x: x + 4, y: y - 4 - size - li * size * 1.3, size, font }));
          }
          y -= rowH;
        }
        y -= 8;
        break;
      }
    }
  }

  if (footnotes.length) {
    y -= 10;
    ensure(20);
    page.drawLine({ start: { x: MARGIN, y }, end: { x: MARGIN + 150, y }, thickness: 0.5 });
    y -= 8;
    footnotes.forEach((f, i) => drawRuns([{ text: `${i + 1}. ${f}` }], 9, 4, rgb(0.3, 0.3, 0.3)));
  }
  return doc.save();
}

function sanitize(text: string, font: PDFFont): string {
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

export async function embedDataUrl(doc: PDFDocument, src: string): Promise<PDFImage | null> {
  const m = /^data:(image\/(png|jpeg|jpg));base64,(.+)$/i.exec(src);
  if (!m) return null;
  const bytes = Uint8Array.from(atob(m[3]), (c) => c.charCodeAt(0));
  try {
    return m[2].toLowerCase() === "png" ? await doc.embedPng(bytes) : await doc.embedJpg(bytes);
  } catch {
    return null;
  }
}
