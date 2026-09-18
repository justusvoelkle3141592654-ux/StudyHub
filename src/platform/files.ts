/**
 * File picking that works both inside Tauri (native dialogs) and in the
 * browser dev build (`<input type="file">`).
 */
import { isTauri } from "./index";

export interface PickedTextFile {
  name: string;
  path: string | null;
  text: string;
}

export interface PickOptions {
  multiple?: boolean;
  /** Extensions without dot, e.g. ["csv", "txt"]. */
  extensions?: string[];
  filterName?: string;
}

const decoder = new TextDecoder("utf-8");

export async function pickTextFiles(options: PickOptions = {}): Promise<PickedTextFile[]> {
  if (isTauri()) {
    const { open } = await import("@tauri-apps/plugin-dialog");
    const { native } = await import("./native");
    const selected = await open({
      multiple: options.multiple ?? false,
      directory: false,
      filters: options.extensions ? [{ name: options.filterName ?? "Files", extensions: options.extensions }] : undefined,
    });
    const paths = (Array.isArray(selected) ? selected : selected ? [selected] : []) as string[];
    const out: PickedTextFile[] = [];
    for (const p of paths) {
      const bytes = await native.readFile(p);
      out.push({ name: p.split(/[\\/]/).pop() ?? p, path: p, text: decoder.decode(bytes) });
    }
    return out;
  }
  return browserPick({ multiple: options.multiple ?? false, accept: options.extensions?.map((e) => `.${e}`).join(",") });
}

/** Pick a folder and return all Markdown files in it (recursively). */
export async function pickMarkdownFolder(): Promise<{ folder: string | null; files: PickedTextFile[] }> {
  if (isTauri()) {
    const { open } = await import("@tauri-apps/plugin-dialog");
    const { native } = await import("./native");
    const dir = (await open({ directory: true, multiple: false })) as string | null;
    if (!dir) return { folder: null, files: [] };
    const files: PickedTextFile[] = [];
    const walk = async (d: string) => {
      for (const entry of await native.listDir(d)) {
        if (entry.is_dir) await walk(entry.path);
        else if (/\.(md|markdown)$/i.test(entry.name)) {
          files.push({ name: entry.name, path: entry.path, text: decoder.decode(await native.readFile(entry.path)) });
        }
      }
    };
    await walk(dir);
    return { folder: dir.split(/[\\/]/).pop() ?? dir, files };
  }
  const files = await browserPick({ multiple: true, accept: ".md,.markdown", directory: true });
  const folder = files[0]?.path?.split("/")[0] ?? null;
  return { folder, files: files.filter((f) => /\.(md|markdown)$/i.test(f.name)) };
}

/** Pick a directory (desktop only). Returns null in the browser. */
export async function pickDirectory(defaultPath?: string): Promise<string | null> {
  if (!isTauri()) return null;
  const { open } = await import("@tauri-apps/plugin-dialog");
  const dir = await open({ directory: true, multiple: false, defaultPath });
  return (dir as string | null) ?? null;
}

function browserPick(opts: { multiple: boolean; accept?: string; directory?: boolean }): Promise<PickedTextFile[]> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.multiple = opts.multiple;
    if (opts.accept) input.accept = opts.accept;
    if (opts.directory) input.setAttribute("webkitdirectory", "");
    input.style.display = "none";
    input.onchange = async () => {
      const files = Array.from(input.files ?? []);
      const out: PickedTextFile[] = [];
      for (const f of files) {
        out.push({ name: f.name, path: (f as File & { webkitRelativePath?: string }).webkitRelativePath || null, text: await f.text() });
      }
      input.remove();
      resolve(out);
    };
    input.oncancel = () => {
      input.remove();
      resolve([]);
    };
    document.body.appendChild(input);
    input.click();
  });
}
