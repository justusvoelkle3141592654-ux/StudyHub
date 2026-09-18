import { isTauri } from "./index";

export interface SaveOptions {
  suggestedName: string;
  /** Extensions without dot. */
  extensions: string[];
  filterName?: string;
  mimeType?: string;
}

/**
 * Save bytes to a user-chosen location. Tauri: native save dialog (the
 * dialog plugin adds the picked path to the fs scope). Browser: download.
 * Returns the path (Tauri) or the file name (browser), null when cancelled.
 */
export async function saveFileAs(data: Uint8Array | string, options: SaveOptions): Promise<string | null> {
  const bytes = typeof data === "string" ? new TextEncoder().encode(data) : data;
  if (isTauri()) {
    const { save } = await import("@tauri-apps/plugin-dialog");
    const path = await save({
      defaultPath: options.suggestedName,
      filters: [{ name: options.filterName ?? options.extensions.join(", ").toUpperCase(), extensions: options.extensions }],
    });
    if (!path) return null;
    const fs = await import("@tauri-apps/plugin-fs");
    await fs.writeFile(path, bytes);
    return path;
  }
  const blob = new Blob([bytes as BlobPart], { type: options.mimeType ?? "application/octet-stream" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = options.suggestedName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return options.suggestedName;
}

/** Make a string safe for use as a file name. */
export function safeFileName(name: string, fallback = "export"): string {
  // eslint-disable-next-line no-control-regex
  const cleaned = name.replace(/[\\/:*?"<>|\x00-\x1f]/g, "").trim().slice(0, 80);
  return cleaned || fallback;
}
