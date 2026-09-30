"use client";

import { useEffect, useEffectEvent, useRef, useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { trackPublicGrowthEvent } from "@/lib/growth/client";
import { clearUserReceipts, combineReceipts, extensionLink, extensionMessage, processReceipt, receipt, receiptKey, type BatchReceipt, type CaptureInfo, type ExtensionLink } from "@/lib/scan/extension-batch";
import type { BankrollOption } from "./scan-flow";
import { ScanRequestError } from "@/lib/scan/scan-client";

export type ExtensionReview = ReturnType<typeof combineReceipts> & { bankrollId: string };
const subscribeHash = (callback: () => void) => { window.addEventListener("hashchange", callback); return () => window.removeEventListener("hashchange", callback); };
const readHash = () => window.location.hash;
const serverHash = () => "";
type ExtensionBatchProps = {
  userId: string; bankrolls: BankrollOption[]; bankrollId: string; onBankrollChange(id: string): void; onReview(result: ExtensionReview, cleanup: () => Promise<void>): Promise<void>;
};
export function ExtensionBatch(props: ExtensionBatchProps) {
  const link: ExtensionLink | null = extensionLink(useSyncExternalStore(subscribeHash, readHash, serverHash));
  return link ? <ExtensionBatchContent key={`${link.extension}:${link.batch}`} {...props} link={link} /> : null;
}
function ExtensionBatchContent({ userId, bankrolls, bankrollId, onBankrollChange, onReview, link }: ExtensionBatchProps & { link: ExtensionLink }) {
  const [status, setStatus] = useState("");
  const [failures, setFailures] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [ready, setReady] = useState<{ rows: BatchReceipt[]; captures: CaptureInfo[]; bankrollId: string } | null>(null);
  const autoStarted = useRef(false);
  const review = async (batch = ready) => {
    if (!batch) return;
    const successful = batch.rows.filter((row) => row.scan || row.skipped);
    if (!successful.some((row) => row.scan?.bets.length)) { setStatus("Aucun pari détecté. Vous pouvez supprimer les captures depuis l’extension ou corriger puis réessayer."); return; }
    await onReview({ ...combineReceipts(successful), bankrollId: batch.bankrollId }, async () => {
      // Called only after a successful import. Failed captures remain available.
      for (const capture of batch.captures) {
        const key = receiptKey(userId, batch.bankrollId, capture.id);
        if (!successful.some((row) => row.key === key)) continue;
        await extensionMessage(link, { type: "delete", id: capture.id });
        await receipt(key, undefined, true);
      }
    });
  };
  const run = async () => {
    if (lock.current) return;
    lock.current = true; setBusy(true); setFailures([]);
    const rows: BatchReceipt[] = [];
    const failed: string[] = [];
    const selectedBankroll = bankrollId;
    try {
      const result = await extensionMessage<{ captures: CaptureInfo[]; events?: { id: string; name: string }[] }>(link, { type: "list" });
      const captures = result.captures;
      if (!Array.isArray(captures) || captures.length > 100 || captures.reduce((n, row) => n + row.size, 0) > 40 * 1024 * 1024) throw new Error("Lot invalide ou trop volumineux.");
      void trackPublicGrowthEvent("batch_upload_started", { screenshots_count: captures.length });
      const allowedEvents = ["extension_opened", "capture_started", "capture_completed", "capture_deleted"] as const;
      const localEvents = (result.events ?? []).slice(0, 500);
      for (const name of allowedEvents) {
        const count = localEvents.filter((event) => event.name === name).length;
        if (count) void trackPublicGrowthEvent(name, { events_count: count });
      }
      if (localEvents.length) void extensionMessage(link, { type: "ackEvents", ids: localEvents.map((event) => event.id) }).catch(() => undefined);
      for (let i = 0; i < captures.length; i++) {
        const capture = captures[i];
        setStatus(`Transfert et analyse ${i + 1} / ${captures.length} — ${failed.length} échec(s)`);
        try {
          if (typeof capture.id !== "string" || capture.size <= 0 || capture.size > 4 * 1024 * 1024) throw new Error("Capture invalide.");
          const key = receiptKey(userId, selectedBankroll, capture.id);
          let row = await receipt(key);
          if (!row) {
            const data = await extensionMessage<{ data: string; mime: string }>(link, { type: "read", id: capture.id });
            if (data.mime !== "image/webp" || typeof data.data !== "string" || data.data.length > 6 * 1024 * 1024) throw new Error("Image invalide.");
            const bytes = Uint8Array.from(atob(data.data), (char) => char.charCodeAt(0));
            if (bytes.length !== capture.size) throw new Error("Transfert incomplet.");
            row = { key, file: new File([bytes], `${capture.id}.webp`, { type: data.mime }) };
            await receipt(key, row);
          }
          const alreadyProcessed = !!(row.scan || row.skipped);
          row = await processReceipt(row, selectedBankroll);
          await receipt(key, row);
          rows.push(row);
          if (!alreadyProcessed && row.scan) void trackPublicGrowthEvent("bet_scan_success", { bets_detected: row.scan.bets.length });
        } catch (error) {
          void trackPublicGrowthEvent("bet_scan_failed", { screenshots_count: 1 });
          failed.push(`Capture ${i + 1} : ${error instanceof Error ? error.message : "Échec du transfert"}`);
          if (error instanceof ScanRequestError && [401, 403, 429].includes(error.status)) {
            for (let pending = i + 1; pending < captures.length; pending++) failed.push(`Capture ${pending + 1} : en attente — traitement suspendu.`);
            break;
          }
        }
      }
      const completedBatch = { rows, captures, bankrollId: selectedBankroll };
      setReady(completedBatch);
      setFailures(failed);
      setStatus(`${rows.length} capture(s) traitée(s), ${failed.length} échec(s). Les résultats sont conservés pour la reprise.`);
      void trackPublicGrowthEvent(failed.length ? "batch_upload_failed" : "batch_upload_completed", { screenshots_count: captures.length, failed_count: failed.length });
      if (!failed.length && rows.length) await review(completedBatch);
    } catch (error) { setStatus(error instanceof Error ? error.message : "Connexion interrompue."); }
    finally { lock.current = false; setBusy(false); }
  };
  const start = () => navigator.locks.request("kalivoa-extension-scan", { ifAvailable: true }, async (lease) => {
    if (!lease) { setStatus("Un autre onglet traite déjà un lot. Attendez sa fin avant de reprendre."); return; }
    await run();
  });
  const autoLaunch = useEffectEvent(() => {
    autoStarted.current = true;
    void start().catch((error) => setStatus(String(error)));
  });
  useEffect(() => {
    // The send action already grants consent. With one bankroll there is no
    // ambiguous destination, so the complete batch starts without another click.
    if (bankrolls.length !== 1 || autoStarted.current) return;
    const timer = window.setTimeout(() => autoLaunch(), 0);
    return () => window.clearTimeout(timer);
  }, [bankrolls.length]);
  return <section className="glass-card rounded-xl p-4">
    <h2 className="font-semibold">Captures de l’extension Kalivoa</h2>
    <p className="mt-2 text-sm text-muted-foreground">Vous êtes connecté à Kalivoa. Choisissez la bankroll du lot. Une image analysée utilise un Scan de votre offre. Gardez cet onglet ouvert pendant le traitement. Les captures seront supprimées après l’import réussi ; les échecs resteront disponibles.</p>
    <label className="mt-3 block text-sm">Bankroll <select className="ml-2 rounded border p-2" disabled={busy || !!ready} value={bankrollId} onChange={(event) => onBankrollChange(event.target.value)}>{bankrolls.map((bankroll) => <option key={bankroll.id} value={bankroll.id}>{bankroll.name}</option>)}</select></label>
    <p role="status" className="my-3 text-sm">{status}</p>
    <Button disabled={busy || !bankrollId} onClick={() => void start().catch((error) => setStatus(String(error)))}>{busy ? "Traitement en cours…" : failures.length ? "Reprendre les captures en échec" : "Traiter les captures"}</Button>
    {!!failures.length && ready?.rows.length ? <Button className="ml-2" disabled={busy} onClick={() => void review().catch((error) => setStatus(String(error)))}>Vérifier les captures réussies</Button> : null}
    <Button className="mt-2" variant="outline" disabled={busy} onClick={() => {
      if (confirm("Effacer les copies locales de vos lots Kalivoa ? Les captures de l’extension et les paris importés sont conservés.")) {
        void clearUserReceipts(userId).then(() => { setReady(null); setFailures([]); setStatus("Copies locales effacées. Les captures de l’extension restent disponibles."); }).catch((error) => setStatus(String(error)));
      }
    }}>Effacer les copies locales</Button>
    {!!failures.length && <ul className="mt-3 text-xs text-loss">{failures.map((failure) => <li key={failure}>{failure}</li>)}</ul>}
  </section>;
}
