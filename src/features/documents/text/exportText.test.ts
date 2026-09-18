import { describe, expect, it } from "vitest";
import { flattenDoc, type PmNode } from "./docModel";
import { buildDocx } from "./exportDocx";
import { renderRichPdf } from "@/lib/pdf/richPdf";
import { PDFDocument } from "pdf-lib";

const doc: PmNode = {
  type: "doc",
  content: [
    { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Überschrift" }] },
    { type: "paragraph", content: [{ type: "text", text: "Text mit Fußnote" }, { type: "footnote", attrs: { text: "Anmerkung" } }] },
    { type: "bulletList", content: [{ type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Punkt", marks: [{ type: "bold" }] }] }] }] },
    { type: "pageBreak" },
    { type: "table", content: [{ type: "tableRow", content: [{ type: "tableHeader", content: [{ type: "paragraph", content: [{ type: "text", text: "Kopf" }] }] }] }, { type: "tableRow", content: [{ type: "tableCell", content: [{ type: "paragraph", content: [{ type: "text", text: "Zelle" }] }] }] }] },
  ],
};

describe("text document exports", () => {
  it("builds a DOCX (zip) with footnotes, lists, tables and page breaks", async () => {
    const { blocks, footnotes } = flattenDoc(doc);
    const bytes = await buildDocx("Testdokument", blocks, footnotes);
    expect(Array.from(bytes.slice(0, 2))).toEqual([0x50, 0x4b]); // "PK"
    expect(bytes.length).toBeGreaterThan(2000);
  });

  it("renders a multi-page PDF", async () => {
    const { blocks, footnotes } = flattenDoc(doc);
    const bytes = await renderRichPdf("Testdokument", blocks, footnotes);
    expect(new TextDecoder("latin1").decode(bytes.slice(0, 4))).toBe("%PDF");
    const loaded = await PDFDocument.load(bytes);
    expect(loaded.getPageCount()).toBe(2); // page break → 2 pages
  });
});
