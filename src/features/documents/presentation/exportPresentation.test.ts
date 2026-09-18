import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { createSlide, emptyPresentation, parsePresentation } from "./model";
import { presentationToPdf, presentationToPptx } from "./exportPresentation";

const labels = { title: "Titel", subtitle: "Untertitel", content: "Inhalt", left: "Links", right: "Rechts", image: "Bild" };

describe("presentation exports", () => {
  it("creates layouts and parses stored JSON", () => {
    const p = emptyPresentation(labels);
    p.slides.push(createSlide("twoColumns", labels), createSlide("imageOnly", labels), createSlide("blank", labels));
    expect(p.slides.map((s) => s.elements.length)).toEqual([2, 3, 1, 0]);
    const parsed = parsePresentation(JSON.stringify(p));
    expect(parsed?.slides).toHaveLength(4);
    expect(parsePresentation("{}")).toBeNull();
  });

  it("exports one PDF page per slide", async () => {
    const p = emptyPresentation(labels);
    p.slides.push(createSlide("titleContent", labels));
    p.slides[1].elements.push({ id: "s", kind: "shape", shape: "ellipse", x: 60, y: 60, w: 20, h: 20, fill: "#ff0000" });
    const bytes = await presentationToPdf("Deck", p);
    expect((await PDFDocument.load(bytes)).getPageCount()).toBe(2);
  });

  it("exports a PPTX archive with notes", async () => {
    const p = emptyPresentation(labels);
    p.slides[0].notes = "Sprechernotiz";
    p.slides.push(createSlide("twoColumns", labels));
    const bytes = await presentationToPptx("Deck", p);
    expect(Array.from(bytes.slice(0, 2))).toEqual([0x50, 0x4b]);
    expect(bytes.length).toBeGreaterThan(10_000);
  });
});
