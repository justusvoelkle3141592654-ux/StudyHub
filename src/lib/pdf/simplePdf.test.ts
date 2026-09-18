import { describe, expect, it } from "vitest";
import { markdownToBlocks, renderSimplePdf } from "./simplePdf";

describe("simplePdf", () => {
  it("converts markdown into blocks", () => {
    const blocks = markdownToBlocks("# Titel\n\nText mit **fett** und [Link](http://x).\n\n- eins\n- [x] zwei\n\n```\ncode\n```");
    expect(blocks.map((b) => b.kind)).toEqual(["h1", "space", "p", "space", "li", "li", "space", "code"]);
    expect(blocks[2].text).toBe("Text mit fett und Link.");
    expect(blocks[5].text).toBe("[x] zwei");
  });

  it("renders a PDF with umlauts and unsupported characters", async () => {
    const bytes = await renderSimplePdf("Prüfung ÄÖÜ ß", [{ kind: "p", text: "Text mit 日本語 und langem ".repeat(30) }]);
    expect(bytes.slice(0, 4)).toEqual(new Uint8Array([0x25, 0x50, 0x44, 0x46])); // %PDF
    expect(bytes.length).toBeGreaterThan(1000);
  });
});
