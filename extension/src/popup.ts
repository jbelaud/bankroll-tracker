import { events, list, mutate } from "./storage.js";
declare const chrome: { runtime: { id: string; sendMessage(message: object): Promise<{ error?: string }> }; tabs: { create(options: object): Promise<unknown> }; action: { setBadgeText(options: object): Promise<void> } };
const element = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const urls: string[] = [];
async function refresh() {
  for (const url of urls.splice(0)) URL.revokeObjectURL(url);
  const rows = await list();
  const bytes = rows.reduce((n, row) => n + row.blob.size, 0);
  element("count").textContent = `${rows.length} captures en attente · ${(bytes / 1024 / 1024).toFixed(1)} / 40 Mo${bytes > 32 * 1024 * 1024 ? " · stockage presque plein" : ""}`;
  element<HTMLButtonElement>("send").disabled = rows.length === 0;
  element("queue").replaceChildren();
  for (const row of rows) {
    const article = document.createElement("article");
    const image = document.createElement("img");
    image.src = URL.createObjectURL(row.blob); urls.push(image.src); image.alt = "Capture du ticket";
    const remove = document.createElement("button"); remove.textContent = "Supprimer";
    remove.onclick = () => void run(async () => { await mutate("delete", row.id); await events("capture_deleted").catch(() => undefined); await refresh(); });
    article.append(image, remove); element("queue").append(article);
  }
  await chrome.action.setBadgeText({ text: String(rows.length || "") });
}
async function run(action: () => Promise<void>) {
  element("error").textContent = "";
  try { await action(); } catch (error) { element("error").textContent = error instanceof Error ? error.message : "Une erreur est survenue."; }
}
element("capture").onclick = () => void run(async () => { const response = await chrome.runtime.sendMessage({ type: "start" }); if (response.error) throw new Error(response.error); window.close(); });
element("login").onclick = () => void run(async () => { await chrome.tabs.create({ url: `${element<HTMLSelectElement>("destination").value}/fr/scan` }); window.close(); });
element("clear").onclick = () => void run(async () => { if (confirm("Supprimer définitivement toutes les captures locales ?")) { await mutate("clear"); await refresh(); } });
element("send").onclick = () => void run(async () => {
  const rows = await list(); if (!rows.length) return;
  const batch = rows[0].batch && rows.every((row) => row.batch === rows[0].batch) ? rows[0].batch : crypto.randomUUID();
  await mutate("batch", batch, rows.map((row) => row.id));
  const origin = element<HTMLSelectElement>("destination").value;
  await chrome.tabs.create({ url: `${origin}/fr/scan#extension=${chrome.runtime.id}&batch=${batch}` });
  window.close();
});
void fetch("manifest.json").then((response) => response.json()).then((manifest) => {
  if (manifest.externally_connectable.matches.includes("http://localhost/*")) {
    const option = document.createElement("option"); option.value = "http://localhost:3000"; option.textContent = "Développement local"; element<HTMLSelectElement>("destination").append(option);
  }
});
void events("extension_opened").catch(() => undefined);
void run(refresh);
