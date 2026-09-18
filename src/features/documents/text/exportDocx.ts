import {
  AlignmentType,
  Document,
  ExternalHyperlink,
  FootnoteReferenceRun,
  HeadingLevel,
  ImageRun,
  PageBreak,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";
import type { FlatBlock, TextRunSpec } from "./docModel";

const HEADING: Record<number, (typeof HeadingLevel)[keyof typeof HeadingLevel]> = {
  1: HeadingLevel.HEADING_1,
  2: HeadingLevel.HEADING_2,
  3: HeadingLevel.HEADING_3,
  4: HeadingLevel.HEADING_4,
  5: HeadingLevel.HEADING_5,
  6: HeadingLevel.HEADING_6,
};

/** Optional hook to measure images (browser only). Returns natural size in px. */
export type ImageMeasurer = (src: string) => Promise<{ width: number; height: number } | null>;

function runsToDocx(runs: TextRunSpec[]): Array<TextRun | FootnoteReferenceRun | ExternalHyperlink> {
  const out: Array<TextRun | FootnoteReferenceRun | ExternalHyperlink> = [];
  for (const r of runs) {
    if (r.footnote) {
      out.push(new FootnoteReferenceRun(r.footnote));
      continue;
    }
    const run = new TextRun({ text: r.text, bold: r.bold, italics: r.italic, underline: r.underline ? {} : undefined, strike: r.strike, font: r.code ? "Courier New" : undefined, break: r.break ? 1 : undefined, style: r.link ? "Hyperlink" : undefined });
    out.push(r.link ? new ExternalHyperlink({ link: r.link, children: [run] }) : run);
  }
  return out;
}

/** Build a .docx from flattened blocks. */
export async function buildDocx(title: string, blocks: FlatBlock[], footnotes: string[], measure?: ImageMeasurer): Promise<Uint8Array> {
  const children: Array<Paragraph | Table> = [new Paragraph({ text: title, heading: HeadingLevel.TITLE })];
  for (const b of blocks) {
    switch (b.kind) {
      case "heading":
        children.push(new Paragraph({ heading: HEADING[Math.min(6, Math.max(1, b.level ?? 1))], children: runsToDocx(b.runs ?? []) }));
        break;
      case "paragraph":
        children.push(new Paragraph({ children: runsToDocx(b.runs ?? []) }));
        break;
      case "listItem":
        children.push(
          new Paragraph({
            children: runsToDocx(b.runs ?? []),
            ...(b.ordered ? { numbering: { reference: "studyhub-numbers", level: Math.min(8, (b.level ?? 1) - 1) } } : { bullet: { level: Math.min(8, (b.level ?? 1) - 1) } }),
          }),
        );
        break;
      case "quote":
        children.push(new Paragraph({ children: runsToDocx((b.runs ?? []).map((r) => ({ ...r, italic: true }))), indent: { left: 720 }, alignment: AlignmentType.LEFT }));
        break;
      case "code":
        for (const line of (b.text ?? "").split("\n")) children.push(new Paragraph({ children: [new TextRun({ text: line, font: "Courier New", size: 20 })] }));
        break;
      case "rule":
        children.push(new Paragraph({ border: { bottom: { style: "single", size: 6, color: "999999", space: 1 } } }));
        break;
      case "pageBreak":
        children.push(new Paragraph({ children: [new PageBreak()] }));
        break;
      case "image": {
        const m = /^data:image\/(png|jpeg|jpg|gif|bmp);base64,(.+)$/i.exec(b.src ?? "");
        if (!m) break;
        const bytes = Uint8Array.from(atob(m[2]), (c) => c.charCodeAt(0));
        const natural = measure ? await measure(b.src ?? "") : null;
        const maxW = 600;
        const w = natural ? Math.min(maxW, natural.width) : maxW * 0.7;
        const h = natural ? (w / natural.width) * natural.height : w * 0.66;
        const type = m[1].toLowerCase() === "jpeg" ? "jpg" : (m[1].toLowerCase() as "png" | "jpg" | "gif" | "bmp");
        children.push(new Paragraph({ children: [new ImageRun({ type, data: bytes, transformation: { width: Math.round(w), height: Math.round(h) }, altText: { title: b.alt ?? "", description: b.alt ?? "", name: b.alt ?? "image" } })] }));
        break;
      }
      case "table": {
        const rows = b.rows ?? [];
        if (!rows.length) break;
        children.push(
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: rows.map(
              (row, ri) =>
                new TableRow({
                  tableHeader: ri === 0,
                  children: row.map((cell) => new TableCell({ children: [new Paragraph({ children: runsToDocx(ri === 0 ? cell.map((r) => ({ ...r, bold: true })) : cell) })] })),
                }),
            ),
          }),
        );
        break;
      }
    }
  }
  const doc = new Document({
    creator: "StudyHub",
    title,
    numbering: {
      config: [
        {
          reference: "studyhub-numbers",
          levels: Array.from({ length: 9 }, (_, level) => ({ level, format: "decimal" as const, text: `%${level + 1}.`, alignment: AlignmentType.START, style: { paragraph: { indent: { left: 720 * (level + 1), hanging: 360 } } } })),
        },
      ],
    },
    footnotes: Object.fromEntries(footnotes.map((text, i) => [i + 1, { children: [new Paragraph(text)] }])),
    sections: [{ children }],
  });
  const blob = await Packer.toBlob(doc);
  return new Uint8Array(await blob.arrayBuffer());
}
