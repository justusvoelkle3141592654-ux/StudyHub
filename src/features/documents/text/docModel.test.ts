import { describe, expect, it } from "vitest";
import { docToMarkdown, flattenDoc, parseDoc, wordCount, type PmNode } from "./docModel";

const doc: PmNode = {
  type: "doc",
  content: [
    { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "Titel" }] },
    {
      type: "paragraph",
      content: [
        { type: "text", text: "Ein " },
        { type: "text", text: "fetter", marks: [{ type: "bold" }] },
        { type: "text", text: " Satz" },
        { type: "footnote", attrs: { text: "Quelle A" } },
        { type: "text", text: "." },
      ],
    },
    {
      type: "orderedList",
      attrs: { start: 1 },
      content: [
        { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "eins" }] }] },
        { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "zwei" }] }] },
      ],
    },
    { type: "pageBreak" },
    {
      type: "table",
      content: [
        { type: "tableRow", content: [{ type: "tableHeader", content: [{ type: "paragraph", content: [{ type: "text", text: "A" }] }] }, { type: "tableHeader", content: [{ type: "paragraph", content: [{ type: "text", text: "B" }] }] }] },
        { type: "tableRow", content: [{ type: "tableCell", content: [{ type: "paragraph", content: [{ type: "text", text: "1" }] }] }, { type: "tableCell", content: [{ type: "paragraph", content: [{ type: "text", text: "2|x" }] }] }] },
      ],
    },
    { type: "image", attrs: { src: "data:image/png;base64,AAA", alt: "Bild" } },
  ],
};

describe("docModel", () => {
  it("flattens blocks and numbers footnotes", () => {
    const flat = flattenDoc(doc);
    expect(flat.blocks.map((b) => b.kind)).toEqual(["heading", "paragraph", "listItem", "listItem", "pageBreak", "table", "image"]);
    expect(flat.footnotes).toEqual(["Quelle A"]);
    expect(flat.blocks[1].runs?.find((r) => r.footnote)?.footnote).toBe(1);
    expect(flat.blocks[3]).toMatchObject({ ordered: true, index: 2 });
    expect(flat.blocks[5].rows?.[1][1][0].text).toBe("2|x");
  });

  it("exports GitHub-flavoured Markdown with footnotes", () => {
    const md = docToMarkdown(doc);
    expect(md).toContain("# Titel");
    expect(md).toContain("Ein **fetter** Satz[^1].");
    expect(md).toContain("1. eins\n2. zwei");
    expect(md).toContain("| A | B |\n| --- | --- |\n| 1 | 2\\|x |");
    expect(md).toContain("![Bild](data:image/png;base64,AAA)");
    expect(md.trim().endsWith("[^1]: Quelle A")).toBe(true);
  });

  it("parses stored JSON defensively and counts words", () => {
    expect(parseDoc("garbage").type).toBe("doc");
    expect(parseDoc(JSON.stringify(doc))).toEqual(doc);
    expect(wordCount(doc)).toBe(10);
  });
});
