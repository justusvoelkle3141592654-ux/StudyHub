/**
 * Minimal typing for the TipTap/ProseMirror JSON stored in
 * `documents.content_json` for `doc_type = 'text'`, plus pure converters
 * used by the exports (Markdown, PDF blocks, DOCX).
 */
export interface PmMark {
  type: string;
  attrs?: Record<string, unknown>;
}

export interface PmNode {
  type: string;
  attrs?: Record<string, unknown>;
  content?: PmNode[];
  marks?: PmMark[];
  text?: string;
}

export const EMPTY_DOC: PmNode = { type: "doc", content: [{ type: "paragraph" }] };

export function parseDoc(json: string): PmNode {
  try {
    const parsed = JSON.parse(json) as PmNode;
    return parsed && parsed.type === "doc" ? parsed : EMPTY_DOC;
  } catch {
    return EMPTY_DOC;
  }
}

/** Inline runs with resolved formatting (used by DOCX/PDF). */
export interface TextRunSpec {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strike?: boolean;
  code?: boolean;
  link?: string;
  /** Footnote number (1-based) when this run is a footnote reference. */
  footnote?: number;
  /** Line break. */
  break?: boolean;
}

export interface FlatBlock {
  kind: "heading" | "paragraph" | "listItem" | "code" | "quote" | "image" | "table" | "rule" | "pageBreak";
  level?: number; // heading level or list depth
  ordered?: boolean;
  index?: number; // 1-based number for ordered items
  runs?: TextRunSpec[];
  text?: string; // code
  src?: string; // image
  alt?: string;
  rows?: TextRunSpec[][][]; // table: rows → cells → runs
}

export interface FlattenedDoc {
  blocks: FlatBlock[];
  footnotes: string[];
}

/** Walk the document into a flat list of blocks; footnotes are numbered in order of appearance. */
export function flattenDoc(doc: PmNode): FlattenedDoc {
  const blocks: FlatBlock[] = [];
  const footnotes: string[] = [];

  const inline = (nodes: PmNode[] | undefined): TextRunSpec[] => {
    const runs: TextRunSpec[] = [];
    for (const n of nodes ?? []) {
      if (n.type === "text") {
        const run: TextRunSpec = { text: n.text ?? "" };
        for (const m of n.marks ?? []) {
          if (m.type === "bold") run.bold = true;
          else if (m.type === "italic") run.italic = true;
          else if (m.type === "underline") run.underline = true;
          else if (m.type === "strike") run.strike = true;
          else if (m.type === "code") run.code = true;
          else if (m.type === "link") run.link = String(m.attrs?.href ?? "");
        }
        runs.push(run);
      } else if (n.type === "hardBreak") runs.push({ text: "", break: true });
      else if (n.type === "footnote") {
        footnotes.push(String(n.attrs?.text ?? ""));
        runs.push({ text: "", footnote: footnotes.length });
      } else if (n.type === "image") {
        runs.push({ text: `[${String(n.attrs?.alt ?? "Bild")}]` });
      }
    }
    return runs;
  };

  const walk = (nodes: PmNode[] | undefined, listDepth: number, ordered: boolean, counter: { n: number }) => {
    for (const n of nodes ?? []) {
      switch (n.type) {
        case "heading":
          blocks.push({ kind: "heading", level: Number(n.attrs?.level ?? 1), runs: inline(n.content) });
          break;
        case "paragraph":
          if (listDepth > 0) blocks.push({ kind: "listItem", level: listDepth, ordered, index: counter.n, runs: inline(n.content) });
          else blocks.push({ kind: "paragraph", runs: inline(n.content) });
          break;
        case "bulletList":
        case "orderedList": {
          const isOrdered = n.type === "orderedList";
          let i = Number(n.attrs?.start ?? 1);
          for (const item of n.content ?? []) {
            walk(item.content, listDepth + 1, isOrdered, { n: i });
            i++;
          }
          break;
        }
        case "blockquote":
          for (const child of n.content ?? []) {
            if (child.type === "paragraph") blocks.push({ kind: "quote", runs: inline(child.content) });
            else walk([child], listDepth, ordered, counter);
          }
          break;
        case "codeBlock":
          blocks.push({ kind: "code", text: (n.content ?? []).map((c) => c.text ?? "").join("") });
          break;
        case "horizontalRule":
          blocks.push({ kind: "rule" });
          break;
        case "pageBreak":
          blocks.push({ kind: "pageBreak" });
          break;
        case "image":
          blocks.push({ kind: "image", src: String(n.attrs?.src ?? ""), alt: n.attrs?.alt ? String(n.attrs.alt) : undefined });
          break;
        case "table": {
          const rows: TextRunSpec[][][] = [];
          for (const row of n.content ?? []) {
            const cells: TextRunSpec[][] = [];
            for (const cell of row.content ?? []) {
              const runs: TextRunSpec[] = [];
              (cell.content ?? []).forEach((p, i) => {
                if (i > 0) runs.push({ text: "", break: true });
                runs.push(...inline(p.content));
              });
              cells.push(runs);
            }
            rows.push(cells);
          }
          blocks.push({ kind: "table", rows });
          break;
        }
        default:
          walk(n.content, listDepth, ordered, counter);
      }
    }
  };
  walk(doc.content, 0, false, { n: 1 });
  return { blocks, footnotes };
}

export function runsToPlain(runs: TextRunSpec[] | undefined): string {
  return (runs ?? []).map((r) => (r.break ? "\n" : r.footnote ? `[${r.footnote}]` : r.text)).join("");
}

/** Markdown export (GFM). */
export function docToMarkdown(doc: PmNode): string {
  const { blocks, footnotes } = flattenDoc(doc);
  const md = (runs: TextRunSpec[] | undefined) =>
    (runs ?? [])
      .map((r) => {
        if (r.break) return "  \n";
        if (r.footnote) return `[^${r.footnote}]`;
        let t = r.text;
        if (!t) return "";
        if (r.code) t = `\`${t}\``;
        if (r.bold) t = `**${t}**`;
        if (r.italic) t = `*${t}*`;
        if (r.strike) t = `~~${t}~~`;
        if (r.underline) t = `<u>${t}</u>`;
        if (r.link) t = `[${t}](${r.link})`;
        return t;
      })
      .join("");
  const out: string[] = [];
  for (const b of blocks) {
    switch (b.kind) {
      case "heading":
        out.push(`${"#".repeat(b.level ?? 1)} ${md(b.runs)}\n`);
        break;
      case "paragraph":
        out.push(`${md(b.runs)}\n`);
        break;
      case "listItem":
        out.push(`${"  ".repeat((b.level ?? 1) - 1)}${b.ordered ? `${b.index ?? 1}.` : "-"} ${md(b.runs)}`);
        break;
      case "quote":
        out.push(`> ${md(b.runs)}\n`);
        break;
      case "code":
        out.push(`\`\`\`\n${b.text ?? ""}\n\`\`\`\n`);
        break;
      case "rule":
        out.push("---\n");
        break;
      case "pageBreak":
        out.push('<div style="page-break-after: always"></div>\n');
        break;
      case "image":
        out.push(`![${b.alt ?? ""}](${b.src ?? ""})\n`);
        break;
      case "table": {
        const rows = b.rows ?? [];
        if (!rows.length) break;
        const cell = (runs: TextRunSpec[]) => md(runs).replace(/\n/g, " ").replace(/\|/g, "\\|");
        out.push(`| ${rows[0].map(cell).join(" | ")} |`);
        out.push(`| ${rows[0].map(() => "---").join(" | ")} |`);
        for (const r of rows.slice(1)) out.push(`| ${r.map(cell).join(" | ")} |`);
        out.push("");
        break;
      }
    }
  }
  if (footnotes.length) {
    out.push("");
    footnotes.forEach((f, i) => out.push(`[^${i + 1}]: ${f}`));
  }
  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim() + "\n";
}

/** Plain-text word count of a document. */
export function wordCount(doc: PmNode): number {
  const { blocks } = flattenDoc(doc);
  return blocks
    .map((b) => (b.kind === "code" ? (b.text ?? "") : b.kind === "table" ? (b.rows ?? []).flat().map(runsToPlain).join(" ") : runsToPlain(b.runs)))
    .join(" ")
    .split(/\s+/)
    .filter(Boolean).length;
}
