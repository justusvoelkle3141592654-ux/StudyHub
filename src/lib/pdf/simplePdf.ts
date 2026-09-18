import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib";

/**
 * Minimal, plain text-to-PDF renderer (title + paragraphs, headings bold).
 * Uses the built-in Helvetica fonts (WinAnsi encoding: Latin-1 incl. German
 * umlauts and ß). Characters outside that range are replaced with "?".
 */
export interface PdfBlock {
  kind: "h1" | "h2" | "h3" | "p" | "li" | "code" | "space";
  text: string;
}

const PAGE = { width: 595.28, height: 841.89 }; // A4 in points
const MARGIN = 56;

export async function renderSimplePdf(title: string, blocks: PdfBlock[], options: { author?: string } = {}): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(title);
  doc.setCreator("StudyHub");
  if (options.author) doc.setAuthor(options.author);
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const mono = await doc.embedFont(StandardFonts.Courier);

  let page = doc.addPage([PAGE.width, PAGE.height]);
  let y = PAGE.height - MARGIN;
  const maxWidth = PAGE.width - 2 * MARGIN;

  const ensureSpace = (needed: number) => {
    if (y - needed < MARGIN) {
      page = doc.addPage([PAGE.width, PAGE.height]);
      y = PAGE.height - MARGIN;
    }
  };

  const drawLines = (text: string, font: PDFFont, size: number, indent = 0, color = rgb(0.1, 0.1, 0.1)) => {
    const lines = wrap(sanitize(text, font), font, size, maxWidth - indent);
    const lineHeight = size * 1.35;
    for (const line of lines) {
      ensureSpace(lineHeight);
      page.drawText(line, { x: MARGIN + indent, y: y - size, size, font, color });
      y -= lineHeight;
    }
  };

  drawLines(title, bold, 20);
  y -= 8;
  for (const b of blocks) {
    switch (b.kind) {
      case "h1":
        y -= 8;
        drawLines(b.text, bold, 16);
        y -= 2;
        break;
      case "h2":
        y -= 6;
        drawLines(b.text, bold, 13.5);
        y -= 2;
        break;
      case "h3":
        y -= 4;
        drawLines(b.text, bold, 12);
        break;
      case "li":
        drawLines(`- ${b.text}`, regular, 11, 10);
        break;
      case "code":
        drawLines(b.text, mono, 9.5, 8, rgb(0.25, 0.25, 0.25));
        break;
      case "space":
        y -= 6;
        break;
      default:
        drawLines(b.text, regular, 11);
        y -= 3;
    }
  }
  return doc.save();
}

function sanitize(text: string, font: PDFFont): string {
  let out = "";
  for (const ch of text.replace(/\t/g, "    ")) {
    try {
      font.encodeText(ch);
      out += ch;
    } catch {
      out += "?";
    }
  }
  return out;
}

export function wrap(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split(/\r?\n/)) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    if (!words.length) {
      lines.push("");
      continue;
    }
    let current = "";
    for (const w of words) {
      const candidate = current ? `${current} ${w}` : w;
      if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
        current = candidate;
      } else {
        if (current) lines.push(current);
        // Hard-break overlong words.
        let word = w;
        while (font.widthOfTextAtSize(word, size) > maxWidth && word.length > 1) {
          let cut = word.length;
          while (cut > 1 && font.widthOfTextAtSize(word.slice(0, cut), size) > maxWidth) cut--;
          lines.push(word.slice(0, cut));
          word = word.slice(cut);
        }
        current = word;
      }
    }
    if (current) lines.push(current);
  }
  return lines;
}

/** Convert Markdown into flat PDF blocks (headings, lists, code, paragraphs). */
export function markdownToBlocks(markdown: string): PdfBlock[] {
  const blocks: PdfBlock[] = [];
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  let inCode = false;
  let paragraph: string[] = [];
  const flush = () => {
    if (paragraph.length) {
      blocks.push({ kind: "p", text: inlineToPlain(paragraph.join(" ")) });
      paragraph = [];
    }
  };
  for (const raw of lines) {
    if (raw.trim().startsWith("```")) {
      flush();
      inCode = !inCode;
      continue;
    }
    if (inCode) {
      blocks.push({ kind: "code", text: raw });
      continue;
    }
    const h = /^(#{1,6})\s+(.*)$/.exec(raw);
    if (h) {
      flush();
      blocks.push({ kind: h[1].length === 1 ? "h1" : h[1].length === 2 ? "h2" : "h3", text: inlineToPlain(h[2]) });
      continue;
    }
    const li = /^\s*(?:[-*+]|\d+[.)])\s+(.*)$/.exec(raw);
    if (li) {
      flush();
      blocks.push({ kind: "li", text: inlineToPlain(li[1].replace(/^\[[ xX]\]\s*/, (m) => (/[xX]/.test(m) ? "[x] " : "[ ] "))) });
      continue;
    }
    if (!raw.trim()) {
      flush();
      blocks.push({ kind: "space", text: "" });
      continue;
    }
    paragraph.push(raw.replace(/^>\s?/, "").trim());
  }
  flush();
  return blocks;
}

function inlineToPlain(s: string): string {
  return s
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/(\*\*|__)(.*?)\1/g, "$2")
    .replace(/(\*|_)(.*?)\1/g, "$2")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/~~(.*?)~~/g, "$1");
}
