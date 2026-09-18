import { describe, expect, it } from "vitest";
import { markdownToHtml } from "./markdownToHtml";

describe("markdownToHtml", () => {
  it("converts headings, lists, paragraphs and inline marks", () => {
    const html = markdownToHtml("# Titel\n\nEin **fetter** Satz mit *kursiv* und `code`.\n\n- eins\n- zwei\n\n1. a\n2. b\n<script>");
    expect(html).toBe("<h1>Titel</h1><p>Ein <strong>fetter</strong> Satz mit <em>kursiv</em> und <code>code</code>.</p><ul><li><p>eins</p></li><li><p>zwei</p></li></ul><ol><li><p>a</p></li><li><p>b</p></li></ol><p>&lt;script&gt;</p>");
  });
  it("joins wrapped lines into one paragraph", () => {
    expect(markdownToHtml("erste Zeile\nzweite Zeile")).toBe("<p>erste Zeile zweite Zeile</p>");
  });
});
