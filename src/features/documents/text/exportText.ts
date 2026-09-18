import type { Document as DocRow } from "@/data/types";
import { safeFileName, saveFileAs } from "@/platform/saveFile";
import { renderRichPdf } from "@/lib/pdf/richPdf";
import { docToMarkdown, flattenDoc, parseDoc } from "./docModel";
import { buildDocx } from "./exportDocx";

function measureImage(src: string): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    if (typeof Image === "undefined") return resolve(null);
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

export async function exportTextDocument(row: DocRow, format: "pdf" | "docx" | "md"): Promise<string | null> {
  const doc = parseDoc(row.content_json);
  const name = safeFileName(row.title, "document");
  if (format === "md") {
    return saveFileAs(`# ${row.title}\n\n${docToMarkdown(doc)}`, { suggestedName: `${name}.md`, extensions: ["md"], filterName: "Markdown", mimeType: "text/markdown" });
  }
  const { blocks, footnotes } = flattenDoc(doc);
  if (format === "pdf") {
    const bytes = await renderRichPdf(row.title, blocks, footnotes);
    return saveFileAs(bytes, { suggestedName: `${name}.pdf`, extensions: ["pdf"], filterName: "PDF", mimeType: "application/pdf" });
  }
  const bytes = await buildDocx(row.title, blocks, footnotes, measureImage);
  return saveFileAs(bytes, { suggestedName: `${name}.docx`, extensions: ["docx"], filterName: "Word", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
}
