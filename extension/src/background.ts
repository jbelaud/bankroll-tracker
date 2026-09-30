import { events, list, mutate } from "./storage.js";
import { cropBounds } from "./policy.js";

// Minimal Chrome API surface; runtime validation remains at message boundaries.
declare const chrome: {
  runtime: { id: string; onMessage: { addListener(fn: (message: Record<string, unknown>, sender: Sender, reply: (value: unknown) => void) => boolean): void }; onMessageExternal: { addListener(fn: (message: Record<string, unknown>, sender: Sender, reply: (value: unknown) => void) => boolean): void } };
  tabs: { query(query: object): Promise<Tab[]>; get(id: number): Promise<Tab>; captureVisibleTab(windowId: number, options: object): Promise<string> };
  scripting: { executeScript(options: object): Promise<unknown> };
  action: { setBadgeText(options: object): Promise<void>; setBadgeBackgroundColor(options: object): Promise<void>; setTitle(options: object): Promise<void> };
  commands: { onCommand: { addListener(fn: (command: string) => void): void } };
};
type Tab = { id?: number; windowId: number; url?: string; active?: boolean };
type Sender = { tab?: Tab; url?: string };
async function badge() { await chrome.action.setBadgeText({ text: String((await list()).length || "") }); await chrome.action.setBadgeBackgroundColor({ color: "#6d5dfc" }); }

// This function is serialized by Chrome: keep it self-contained.
function selectArea() {
  if (document.getElementById("kalivoa-capture-overlay")) return;
  const overlay = document.createElement("div");
  overlay.id = "kalivoa-capture-overlay";
  overlay.style.cssText = "position:fixed;inset:0;z-index:2147483647;cursor:crosshair;background:rgba(0,0,0,.15);touch-action:none";
  const box = document.createElement("div");
  box.style.cssText = "position:absolute;border:2px solid #8b7bff;pointer-events:none;box-sizing:border-box";
  const help = document.createElement("div");
  help.textContent = "Kalivoa : encadrez uniquement le ticket · Échap pour annuler";
  help.style.cssText = "position:absolute;top:12px;left:12px;background:#171528;color:white;padding:12px;font:14px sans-serif;border-radius:8px";
  overlay.append(box, help);
  document.documentElement.append(overlay);
  let start: { x: number; y: number } | null = null;
  const cleanup = () => { overlay.remove(); document.removeEventListener("keydown", key, true); };
  const key = (event: KeyboardEvent) => { if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); cleanup(); } };
  document.addEventListener("keydown", key, true);
  overlay.onpointerdown = (event) => { if (event.button !== 0) return; start = { x: event.clientX, y: event.clientY }; overlay.setPointerCapture(event.pointerId); event.preventDefault(); };
  overlay.onpointermove = (event) => {
    if (!start) return;
    Object.assign(box.style, { left: `${Math.min(start.x, event.clientX)}px`, top: `${Math.min(start.y, event.clientY)}px`, width: `${Math.abs(event.clientX - start.x)}px`, height: `${Math.abs(event.clientY - start.y)}px` });
  };
  overlay.onpointerup = async (event) => {
    if (!start) return;
    const rect = { x: Math.min(start.x, event.clientX), y: Math.min(start.y, event.clientY), width: Math.abs(start.x - event.clientX), height: Math.abs(start.y - event.clientY) };
    const viewport = { width: innerWidth, height: innerHeight };
    cleanup();
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    try {
      const response = await (chrome.runtime as unknown as { sendMessage(message: object): Promise<{ error?: string }> }).sendMessage({ type: "crop", rect, viewport });
      if (response?.error) alert(response.error);
    } catch { alert("La capture a échoué. Réessayez depuis l’extension."); }
  };
}
async function start() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || !tab.url || !/^https?:/.test(tab.url)) throw new Error("Ouvrez une page web pour capturer un ticket.");
  await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: selectArea });
  await events("capture_started").catch(() => undefined);
}
async function capture(message: Record<string, unknown>, sender: Sender) {
  if (!sender.tab?.id) throw new Error("Capture non autorisée.");
  const tab = await chrome.tabs.get(sender.tab.id);
  if (!tab.active || !tab.url || !/^https?:/.test(tab.url)) throw new Error("L’onglet a changé. Recommencez la capture.");
  const screenshot = await chrome.tabs.captureVisibleTab(tab.windowId, { format: "png" });
  const current = await chrome.tabs.get(sender.tab.id);
  if (!current.active || current.url !== tab.url) throw new Error("L’onglet a changé pendant la capture. Recommencez.");
  const image = await createImageBitmap(await (await fetch(screenshot)).blob());
  try {
    const rect = cropBounds(message.rect as Parameters<typeof cropBounds>[0], message.viewport as Parameters<typeof cropBounds>[1], image);
    const canvas = new OffscreenCanvas(rect.width, rect.height);
    canvas.getContext("2d")!.drawImage(image, rect.x, rect.y, rect.width, rect.height, 0, 0, rect.width, rect.height);
    const blob = await canvas.convertToBlob({ type: "image/webp", quality: 0.94 });
    await mutate("add", { id: crypto.randomUUID(), blob, createdAt: Date.now(), hostname: new URL(tab.url).hostname });
    await badge();
    await events("capture_completed").catch(() => undefined);
  } finally { image.close(); }
}
chrome.runtime.onMessage.addListener((message, sender, reply) => {
  const action = message.type === "start" ? start() : message.type === "crop" ? capture(message, sender) : Promise.reject(new Error("Message inconnu."));
  action.then(() => reply({ ok: true })).catch((error: Error) => reply({ error: error.message }));
  return true;
});
chrome.commands.onCommand.addListener((command) => { if (command === "capture") void start().catch((error: Error) => chrome.action.setTitle({ title: error.message })); });

chrome.runtime.onMessageExternal.addListener((message, sender, reply) => {
  void (async () => {
    const origin = sender.url ? new URL(sender.url).origin : "";
    if (origin !== "https://kalivoa.com" && origin !== "http://localhost:3000") throw new Error("Origine interdite.");
    if (typeof message.batch !== "string" || !/^[0-9a-f-]{36}$/.test(message.batch)) throw new Error("Lot invalide.");
    const rows = (await list()).filter((row) => row.batch === message.batch);
    if (message.type === "list") return { captures: rows.map(({ id, createdAt, hostname, blob }) => ({ id, createdAt, hostname, size: blob.size })), events: await events() };
    if (message.type === "ackEvents" && Array.isArray(message.ids) && message.ids.length <= 500 && message.ids.every((id) => typeof id === "string")) { await events(undefined, message.ids as string[]); return { ok: true }; }
    const row = rows.find((row) => row.id === message.id);
    if (!row) throw new Error("Capture introuvable.");
    if (message.type === "read") {
      const bytes = new Uint8Array(await row.blob.arrayBuffer());
      let binary = "";
      for (let offset = 0; offset < bytes.length; offset += 8192) binary += String.fromCharCode(...bytes.subarray(offset, offset + 8192));
      return { data: btoa(binary), mime: row.blob.type };
    }
    if (message.type === "delete") { await mutate("delete", row.id); await badge(); return { ok: true }; }
    throw new Error("Message inconnu.");
  })().then(reply).catch((error: Error) => reply({ error: error.message }));
  return true;
});
