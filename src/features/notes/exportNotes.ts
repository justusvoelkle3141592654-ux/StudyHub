import type { Note } from "@/data/types";
import { markdownToBlocks, renderSimplePdf } from "@/lib/pdf/simplePdf";
import { safeFileName, saveFileAs } from "@/platform/saveFile";

export async function exportNoteMarkdown(note: Note): Promise<string | null> {
  const body = note.content_markdown.startsWith("#") ? note.content_markdown : `# ${note.title}\n\n${note.content_markdown}`;
  return saveFileAs(body, { suggestedName: `${safeFileName(note.title, "note")}.md`, extensions: ["md"], filterName: "Markdown", mimeType: "text/markdown" });
}

export async function exportNotePdf(note: Note): Promise<string | null> {
  const bytes = await renderSimplePdf(note.title, markdownToBlocks(note.content_markdown));
  return saveFileAs(bytes, { suggestedName: `${safeFileName(note.title, "note")}.pdf`, extensions: ["pdf"], filterName: "PDF", mimeType: "application/pdf" });
}

/** All notes of a folder as one Markdown file (notes separated by horizontal rules). */
export async function exportFolderMarkdown(folderName: string, notes: Note[]): Promise<string | null> {
  const body = notes.map((n) => `# ${n.title}\n\n${n.content_markdown.trim()}\n`).join("\n---\n\n");
  return saveFileAs(body, { suggestedName: `${safeFileName(folderName, "notes")}.md`, extensions: ["md"], filterName: "Markdown", mimeType: "text/markdown" });
}

export async function exportFolderPdf(folderName: string, notes: Note[]): Promise<string | null> {
  const blocks = notes.flatMap((n) => [{ kind: "h1" as const, text: n.title }, ...markdownToBlocks(n.content_markdown), { kind: "space" as const, text: "" }]);
  const bytes = await renderSimplePdf(folderName, blocks);
  return saveFileAs(bytes, { suggestedName: `${safeFileName(folderName, "notes")}.pdf`, extensions: ["pdf"], filterName: "PDF", mimeType: "application/pdf" });
}
