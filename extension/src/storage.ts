import { canAddCapture } from "./policy.js";
export type Capture = { id: string; blob: Blob; createdAt: number; hostname: string; batch?: string };
export type LocalEvent = { id: string; name: "extension_opened" | "capture_started" | "capture_completed" | "capture_deleted" };
function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("kalivoa-captures", 2);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains("captures")) request.result.createObjectStore("captures", { keyPath: "id" });
      if (!request.result.objectStoreNames.contains("events")) request.result.createObjectStore("events", { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
export async function events(name?: LocalEvent["name"], acknowledge?: string[]): Promise<LocalEvent[]> {
  const db = await open();
  try { return await new Promise((resolve, reject) => {
    const tx = db.transaction("events", "readwrite");
    const store = tx.objectStore("events");
    const request = store.getAll();
    let rows: LocalEvent[] = [];
    request.onsuccess = () => {
      rows = request.result;
      if (acknowledge) for (const id of acknowledge) store.delete(id);
      if (name && rows.length < 500) store.add({ id: crypto.randomUUID(), name });
    };
    tx.oncomplete = () => resolve(rows);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  }); } finally { db.close(); }
}
export async function list(): Promise<Capture[]> {
  const db = await open();
  try { return await new Promise((resolve, reject) => {
    const request = db.transaction("captures").objectStore("captures").getAll();
    request.onsuccess = () => resolve(request.result.sort((a: Capture, b: Capture) => a.createdAt - b.createdAt));
    request.onerror = () => reject(request.error);
  }); } finally { db.close(); }
}
export async function mutate(action: "add" | "delete" | "clear" | "batch", value?: Capture | string, ids?: string[]) {
  const db = await open();
  try { await new Promise<void>((resolve, reject) => {
    const tx = db.transaction("captures", "readwrite");
    const store = tx.objectStore("captures");
    tx.oncomplete = () => resolve();
    tx.onabort = () => reject(tx.error ?? new Error("Limite locale atteinte (100 captures / 40 Mo)."));
    tx.onerror = () => reject(tx.error);
    if (action === "delete") store.delete(value as string);
    else if (action === "clear") store.clear();
    else {
      const request = store.getAll();
      request.onsuccess = () => {
        const rows: Capture[] = request.result;
        if (action === "add") {
          const capture = value as Capture;
          if (!canAddCapture(rows.length, rows.reduce((n, row) => n + row.blob.size, 0), capture.blob.size)) { tx.abort(); return; }
          store.add(capture);
        } else for (const row of rows) if (ids?.includes(row.id)) store.put({ ...row, batch: value });
      };
    }
  }); } finally { db.close(); }
}
