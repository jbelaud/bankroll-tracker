import { scanTickets, type ScanTicketResult } from "./scan-client";
import type { ParsedBet } from "./types";

export type ExtensionLink = { extension: string; batch: string };
export function extensionLink(hash: string): ExtensionLink | null {
  const params = new URLSearchParams(hash.replace(/^#/, ""));
  const extension = params.get("extension") ?? "";
  const batch = params.get("batch") ?? "";
  return /^[a-p]{32}$/.test(extension) && /^[0-9a-f-]{36}$/.test(batch) ? { extension, batch } : null;
}
type Runtime = { sendMessage(id: string, message: object, callback: (response: unknown) => void): void; lastError?: { message?: string } };
export async function extensionMessage<T>(link: ExtensionLink, message: object): Promise<T> {
  const runtime = (window as unknown as { chrome?: { runtime?: Runtime } }).chrome?.runtime;
  if (!runtime) throw new Error("Ouvrez cette page dans Chrome avec l’extension Kalivoa activée.");
  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => reject(new Error("L’extension ne répond pas. Réessayez.")), 30000);
    runtime.sendMessage(link.extension, { ...message, batch: link.batch }, (response) => {
      clearTimeout(timeout);
      const error = runtime.lastError?.message || (response as { error?: string })?.error;
      if (error || !response) reject(new Error(error || "Réponse vide de l’extension.")); else resolve(response as T);
    });
  });
}
export type CaptureInfo = { id: string; createdAt: number; hostname: string; size: number };
export type BatchReceipt = { key: string; file: File; scan?: ScanTicketResult; skipped?: string[] };
export function receiptKey(userId: string, bankrollId: string, captureId: string) { return `${userId}:${bankrollId}:${captureId}`; }
async function database() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open("kalivoa-extension-receipts", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("receipts", { keyPath: "key" });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
export async function receipt(key: string, value?: BatchReceipt, remove = false): Promise<BatchReceipt | undefined> {
  const db = await database();
  try { return await new Promise((resolve, reject) => {
    const tx = db.transaction("receipts", value || remove ? "readwrite" : "readonly");
    const store = tx.objectStore("receipts");
    const request = remove ? store.delete(key) : value ? store.getAll() : store.get(key);
    let result: BatchReceipt | undefined;
    request.onsuccess = () => {
      if (value) {
        const rows = request.result as BatchReceipt[];
        const bytes = rows.filter((row) => row.key !== key).reduce((sum, row) => sum + row.file.size, 0);
        if (bytes + value.file.size > 40 * 1024 * 1024) { tx.abort(); return; }
        store.put(value);
        result = value;
      } else result = remove ? undefined : request.result;
    };
    tx.oncomplete = () => resolve(result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  }); } finally { db.close(); }
}
export async function clearUserReceipts(userId: string) {
  const db = await database();
  try { await new Promise<void>((resolve, reject) => {
    const tx = db.transaction("receipts", "readwrite");
    const store = tx.objectStore("receipts");
    const request = store.getAllKeys();
    request.onsuccess = () => { for (const key of request.result) if (typeof key === "string" && key.startsWith(`${userId}:`)) store.delete(key); };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  }); } finally { db.close(); }
}
export function combineReceipts(rows: BatchReceipt[]) {
  const scans: ScanTicketResult[] = [];
  const bets: ParsedBet[] = [];
  const seen = new Map<string, number>();
  rows.forEach((row, index) => {
    if (!row.scan) return;
    const sourced = row.scan.bets.map((bet) => ({ ...bet, sourceScanIndex: index }));
    scans.push({ ...row.scan, sourceFileIndex: index, bets: sourced });
    for (const bet of sourced) {
      const key = bet.ticketRef?.normalize("NFKC").toLocaleUpperCase("fr").replace(/[^A-Z0-9]/g, "");
      const previous = key ? seen.get(key) : undefined;
      if (previous !== undefined) {
        if (bets[previous].result === "EN_ATTENTE" && bet.result !== "EN_ATTENTE") bets[previous] = bet;
      } else { if (key) seen.set(key, bets.length); bets.push(bet); }
    }
  });
  return { files: rows.map((row) => row.file), bets, scans, skippedDuplicateFiles: rows.flatMap((row) => row.skipped ?? []) };
}
export async function processReceipt(row: BatchReceipt, bankrollId: string, scan = scanTickets): Promise<BatchReceipt> {
  if (row.scan || row.skipped) return row;
  const result = await scan([row.file], bankrollId, undefined, true);
  return { ...row, scan: result.scans[0], skipped: result.skippedDuplicateFiles.length ? result.skippedDuplicateFiles : undefined };
}
