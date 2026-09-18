import { isTauri } from "./index";

const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

/**
 * Let the user pick an image and return it as a `data:` URL so it can be
 * embedded in Markdown (flashcards, notes). Limited to 2 MB to keep the
 * database small.
 */
export async function pickImageAsDataUrl(): Promise<string | null> {
  if (isTauri()) {
    const { open } = await import("@tauri-apps/plugin-dialog");
    const { native } = await import("./native");
    const path = (await open({ multiple: false, directory: false, filters: [{ name: "Images", extensions: ["png", "jpg", "jpeg", "gif", "webp"] }] })) as string | null;
    if (!path) return null;
    const bytes = await native.readFile(path);
    if (bytes.length > MAX_IMAGE_BYTES) throw new Error("Image larger than 2 MB");
    const ext = path.split(".").pop()?.toLowerCase() ?? "png";
    const mime = ext === "jpg" || ext === "jpeg" ? "image/jpeg" : ext === "gif" ? "image/gif" : ext === "webp" ? "image/webp" : "image/png";
    return `data:${mime};base64,${toBase64(bytes)}`;
  }
  return new Promise((resolve, reject) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return resolve(null);
      if (file.size > MAX_IMAGE_BYTES) return reject(new Error("Image larger than 2 MB"));
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    };
    input.oncancel = () => resolve(null);
    input.click();
  });
}

export function toBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  return btoa(binary);
}
