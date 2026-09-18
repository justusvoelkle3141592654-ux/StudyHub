import { getRepos } from "@/data/db";
import type { FileEntry } from "@/data/types";
import { SETTINGS } from "@/app/settingsKeys";
import { getSetting } from "@/stores/settingsStore";
import { isTauri, getPlatform, isDesktopPlatform } from "@/platform";
import { log } from "@/lib/logger";
import { newId } from "@/data/repository";
import { browserFileStore } from "./browserFileStore";

export const WORKING_SUBFOLDERS = ["files", "documents", "exports", "backups"] as const;

/**
 * Resolve the working folder. Desktop: the folder chosen in the wizard (or
 * Documents/StudyHub). Android and other mobile platforms: the app-private
 * data directory, because there is no free file-system access there.
 */
export async function getWorkingFolder(): Promise<string> {
  const { native, appDataDirectory, documentsDirectory, joinPath } = await import("@/platform/native");
  const platform = await getPlatform();
  let folder = getSetting<string | null>(SETTINGS.workingFolder, null);
  if (!folder || !isDesktopPlatform(platform)) {
    if (isDesktopPlatform(platform)) {
      const docs = await documentsDirectory();
      folder = await joinPath(docs ?? (await appDataDirectory()), "StudyHub");
    } else {
      folder = await joinPath(await appDataDirectory(), "StudyHub");
    }
  }
  await native.mkdir(folder);
  for (const sub of WORKING_SUBFOLDERS) await native.mkdir(await joinPath(folder, sub));
  return folder;
}

/** Register the directories the native file commands may touch. */
export async function registerFileRoots(): Promise<void> {
  if (!isTauri()) return;
  try {
    const { native } = await import("@/platform/native");
    const { getDatabase } = await import("@/data/db");
    const dbDir = getDatabase().location.replace(/[\\/][^\\/]+$/, "");
    const working = await getWorkingFolder();
    await native.setAllowedRoots([dbDir, working]);
  } catch (e) {
    log.warn("files", "registering roots failed", e);
  }
}

export function guessMimeType(name: string): string | null {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    pdf: "application/pdf",
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    webp: "image/webp",
    svg: "image/svg+xml",
    txt: "text/plain",
    md: "text/markdown",
    csv: "text/csv",
    json: "application/json",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    zip: "application/zip",
    mp3: "audio/mpeg",
    mp4: "video/mp4",
  };
  return map[ext] ?? null;
}

export async function sha256Bytes(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", bytes as BufferSource);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export interface ImportTarget {
  folderId: string | null;
  subjectId: string | null;
}

/** Import files picked by path (Tauri). Copies or links depending on the setting. */
export async function importPaths(paths: string[], target: ImportTarget): Promise<FileEntry[]> {
  const { native, joinPath } = await import("@/platform/native");
  const repos = getRepos();
  const linkOnly = getSetting<boolean>(SETTINGS.linkFilesInsteadOfCopy, false);
  const working = await getWorkingFolder();
  const out: FileEntry[] = [];
  for (const source of paths) {
    const name = source.split(/[\\/]/).pop() ?? source;
    const stat = await native.stat(source);
    if (stat.is_dir) continue;
    const checksum = await native.sha256File(source);
    let localPath = source;
    let linked = 1;
    if (!linkOnly) {
      const id = newId();
      localPath = await joinPath(working, "files", `${id.slice(0, 8)}-${name}`);
      await native.copyFile(source, localPath);
      linked = 0;
    }
    const row = await repos.files.insert({
      name,
      mime_type: guessMimeType(name),
      size_bytes: stat.size,
      local_path: localPath,
      subject_id: target.subjectId,
      folder_id: target.folderId,
      checksum_sha256: checksum,
      is_linked: linked,
      upload_status: getSetting<boolean>(SETTINGS.autoUpload, true) ? "pending" : "none",
    });
    out.push(row);
  }
  return out;
}

/** Import browser `File` objects (development build / drag-and-drop in the browser). */
export async function importBrowserFiles(files: File[], target: ImportTarget): Promise<FileEntry[]> {
  const repos = getRepos();
  const out: FileEntry[] = [];
  for (const f of files) {
    const bytes = new Uint8Array(await f.arrayBuffer());
    const id = newId();
    await browserFileStore.put(id, bytes);
    const row = await repos.files.insert(
      {
        name: f.name,
        mime_type: f.type || guessMimeType(f.name),
        size_bytes: bytes.length,
        local_path: `idb://${id}`,
        subject_id: target.subjectId,
        folder_id: target.folderId,
        checksum_sha256: await sha256Bytes(bytes),
        is_linked: 0,
        upload_status: getSetting<boolean>(SETTINGS.autoUpload, true) ? "pending" : "none",
      },
      id,
    );
    out.push(row);
  }
  return out;
}

/** Open a native file picker (multiple) and import the selection. */
export async function importViaDialog(target: ImportTarget): Promise<FileEntry[]> {
  if (isTauri()) {
    const { open } = await import("@tauri-apps/plugin-dialog");
    const selected = await open({ multiple: true, directory: false });
    const paths = (Array.isArray(selected) ? selected : selected ? [selected] : []) as string[];
    return paths.length ? importPaths(paths, target) : [];
  }
  return new Promise((resolve, reject) => {
    const input = document.createElement("input");
    input.type = "file";
    input.multiple = true;
    input.onchange = () => importBrowserFiles(Array.from(input.files ?? []), target).then(resolve, reject);
    input.oncancel = () => resolve([]);
    input.click();
  });
}

/** Read the bytes of a stored file (for previews); falls back to the cloud copy when the local file is missing. */
export async function readFileBytes(file: FileEntry): Promise<Uint8Array | null> {
  const local = await readLocalBytes(file);
  if (local) return local;
  if (file.remote_path && file.upload_status === "uploaded") return downloadFromCloud(file);
  return null;
}

async function readLocalBytes(file: FileEntry): Promise<Uint8Array | null> {
  if (!file.local_path) return null;
  if (file.local_path.startsWith("idb://")) return (await browserFileStore.get(file.local_path.slice(6))) ?? null;
  if (!isTauri()) return null;
  const { native } = await import("@/platform/native");
  if (!(await native.exists(file.local_path))) return null;
  return native.readFile(file.local_path);
}

/** Download a file from Supabase Storage (cloud mode) and cache it in the working folder. */
async function downloadFromCloud(file: FileEntry): Promise<Uint8Array | null> {
  const { getSupabase } = await import("@/sync/supabaseClient");
  const { SupabaseRemote } = await import("@/sync/supabaseRemote");
  const { currentUserId } = await import("@/sync/auth");
  const sb = getSupabase();
  const userId = currentUserId();
  if (!sb || !userId || !file.remote_path) return null;
  const bytes = await new SupabaseRemote(sb).downloadFile(userId, file.remote_path);
  try {
    if (isTauri()) {
      const { native, joinPath } = await import("@/platform/native");
      const target = await joinPath(await getWorkingFolder(), "files", `${file.id.slice(0, 8)}-${file.name}`);
      await native.writeFile(target, bytes);
      await getRepos().files.update(file.id, { local_path: target });
    } else {
      await browserFileStore.put(file.id, bytes);
      await getRepos().files.update(file.id, { local_path: `idb://${file.id}` });
    }
  } catch (e) {
    log.warn("files", "caching downloaded file failed", e);
  }
  return bytes;
}

/** Soft-delete the row. Copies on disk are kept (no silent data loss); linked originals are never touched. */
export async function deleteFile(file: FileEntry): Promise<void> {
  await getRepos().files.softDelete(file.id);
  if (file.local_path?.startsWith("idb://")) await browserFileStore.delete(file.local_path.slice(6)).catch(() => undefined);
}

export async function openExternally(file: FileEntry): Promise<void> {
  if (!isTauri() || !file.local_path) return;
  const { native } = await import("@/platform/native");
  await native.openPathExternal(file.local_path);
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
}
