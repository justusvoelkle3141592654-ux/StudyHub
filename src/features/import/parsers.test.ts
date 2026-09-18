import { describe, expect, it } from "vitest";
import { parseAnkiText, parseDate, parseGradesCsv, parseMarkdownNote, parseNumber, parseTasksCsv } from "./parsers";

describe("import parsers", () => {
  it("parses numbers and dates in German and ISO formats", () => {
    expect(parseNumber("1,5")).toBe(1.5);
    expect(parseNumber("13 P")).toBe(13);
    expect(parseNumber("85%")).toBe(85);
    expect(parseNumber("")).toBeNull();
    expect(parseDate("03.09.2026")).toBe("2026-09-03");
    expect(parseDate("2026-09-03T10:00:00Z")).toBe("2026-09-03");
    expect(parseDate("nope")).toBeNull();
  });

  it("parses a grades CSV with German headers and semicolons", () => {
    const csv = "Fach;Titel;Note;Gewichtung;Datum\nMathe;Klausur 1;2,3;2;12.03.2026\nDeutsch;;1;;\n;x;2;;";
    const res = parseGradesCsv(csv, "de_1_6");
    expect(res.items).toHaveLength(2);
    expect(res.items[0]).toMatchObject({ subject: "Mathe", title: "Klausur 1", value: 2.3, weight: 2, date: "2026-03-12" });
    expect(res.items[1].title).toBe("Import");
    expect(res.errors).toHaveLength(1);
  });

  it("parses a tasks CSV", () => {
    const csv = "title,subject,due,priority\nRead chapter 3,Bio,2026-10-01,1\n,Bio,,\n";
    const res = parseTasksCsv(csv);
    expect(res.items).toHaveLength(1);
    expect(res.items[0]).toMatchObject({ title: "Read chapter 3", subject: "Bio", priority: 1 });
    expect(res.items[0].due_at).toMatch(/^2026-10-01T/);
  });

  it("parses Anki plain-text exports with headers and deck column", () => {
    const txt = "#separator:tab\n#html:true\n#deck:1\nBiologie::Zellen\tMitochondrium\tKraftwerk der Zelle<br>ATP\nBiologie::Zellen\tRibosom\tProteinsynthese\n";
    const res = parseAnkiText(txt, "Import");
    expect(res.items).toEqual([
      { front: "Mitochondrium", back: "Kraftwerk der Zelle\nATP", deck: "Zellen" },
      { front: "Ribosom", back: "Proteinsynthese", deck: "Zellen" },
    ]);
    expect(parseAnkiText("front\tback\nbroken", "D").errors).toHaveLength(1);
  });

  it("derives note titles from headings or file names", () => {
    expect(parseMarkdownNote("a.md", "# Hello\n\ntext", null).title).toBe("Hello");
    expect(parseMarkdownNote("my-note.md", "text", "F").title).toBe("my-note");
  });
});
