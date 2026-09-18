/**
 * Browser-only stand-in for the working folder: file contents are kept in
 * IndexedDB so the files module works in development and in Playwright.
 * Inside Tauri files live on disk and this module is not used.
 */
const DB_NAME = "studyhub-files";
const STORE = "blobs";

function openIdb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openIdb();
  return new Promise<T>((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const req = fn(t.objectStore(STORE));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    t.oncomplete = () => db.close();
  });
}

export const browserFileStore = {
  put: (id: string, bytes: Uint8Array) => tx("readwrite", (s) => s.put(bytes, id)),
  get: (id: string) => tx<Uint8Array | undefined>("readonly", (s) => s.get(id)),
  delete: (id: string) => tx("readwrite", (s) => s.delete(id)),
};
