"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { activateScanImprovement, disableScanImprovement, editScanImprovement,
  evaluateScanImprovement, proposeScanImprovement, rollbackScanImprovement } from "@/lib/actions/scan-learning";
import { learningVerdict, MAX_LEARNING_CASES, readLearningDraft } from "@/lib/scan/learning";

const fieldLabels: Record<string, string> = { ticketRef: "numéro du pari", date: "date du pari", sport: "sport", betType: "type de pari",
  description: "sélection jouée", eventResult: "résultat de l’événement", stake: "mise", odds: "cote", result: "statut",
  format: "format", boosted: "cote boostée", originalOdds: "ancienne cote", freebet: "freebet", live: "pari en live",
  cashOutAmount: "cashout effectué", tipster: "tipster", closingOdds: "cote de clôture", selections: "détail des sélections", ticket: "pari manquant" };
function errorLabel(error: string) {
  const [index, field] = error.split(":");
  return index === "extra" ? "pari supplémentaire" : `pari ${Number(index) + 1} : ${fieldLabels[field] ?? field}`;
}

export function ScanLearningPanel({ activeRules, examples, active, reports }: {
  activeRules: string; examples: unknown; active: boolean;
  reports: { id: string; bookmaker: string; status: string; correctionCount: number; correctionTypes: string[] }[];
}) {
  const draft = readLearningDraft(examples);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [editedRules, setEditedRules] = useState<string | null>(null);
  const [progress, setProgress] = useState("");
  const verdict = learningVerdict(draft?.evaluation?.cases ?? []);
  const groups = new Map<string, number>();
  for (const report of reports) if (report.status !== "REJECTED") {
    for (const field of report.correctionTypes) groups.set(field, (groups.get(field) ?? 0) + 1);
  }
  const run = (work: () => Promise<unknown>, success: string) => startTransition(async () => {
    setError(""); setMessage("");
    try { await work(); setMessage(success); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "L’opération a échoué."); }
    finally { setProgress(""); }
  });

  return <section className="glass-card flex flex-col gap-3 rounded-xl p-4 text-xs" aria-busy={pending}>
    <h3 className="text-sm font-semibold">Amélioration assistée du scan</h3>
    <p>Les retours utilisateurs restent à vérifier sur leur capture. Seuls les exemples validés par un administrateur servent aux propositions et aux comparaisons. Aucun apprentissage automatique à partir d’un simple import.</p>
    <p>Complément commun : {active ? "actif" : "inactif — socle commun seul"}.</p>
    {groups.size > 0 && <div className="flex flex-wrap gap-2" aria-label="Champs corrigés dans les rapports affichés">{[...groups].sort((a, b) => b[1] - a[1]).map(([field, count]) =>
      <span key={field} className="rounded bg-muted px-2 py-1">{fieldLabels[field] ?? field} · {count} rapport(s)</span>)}</div>}
    <details><summary className="cursor-pointer font-medium">Consignes complémentaires actives</summary><pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap">{active ? activeRules : "Aucun complément actif."}</pre></details>
    <div className="flex flex-wrap gap-2">
      <Button size="sm" disabled={pending} onClick={() => run(async () => { await proposeScanImprovement(); setEditedRules(null); }, "Proposition préparée. Relis-la, puis compare les scans.")}>Préparer une proposition IA</Button>
      {active && <Button size="sm" variant="outline" disabled={pending} onClick={() => run(disableScanImprovement, "Complément désactivé. Le socle commun reste actif.")}>Revenir au socle commun</Button>}
      {active && <Button size="sm" variant="outline" disabled={pending} onClick={() => run(rollbackScanImprovement, "Le complément validé précédent est rétabli.")}>Rétablir le complément précédent</Button>}
    </div>
    <p className="text-muted-foreground">La préparation et les comparaisons utilisent l’IA et entraînent des frais fournisseur, sans consommer les crédits des utilisateurs. Les captures et leurs corrections restent soumises à la conservation de 30 jours.</p>
    {draft && <>
      <p>{draft.explanation}</p>
      <label className="flex flex-col gap-1">Consignes proposées<textarea maxLength={4_000} rows={7} value={editedRules ?? draft.rules} disabled={pending} onChange={(event) => setEditedRules(event.target.value)} className="rounded border border-border bg-background p-2" /></label>
      <Button size="sm" variant="outline" disabled={pending || editedRules === null || editedRules === draft.rules} onClick={() => run(async () => { await editScanImprovement(editedRules!); setEditedRules(null); }, "Proposition enregistrée. Les comparaisons précédentes sont annulées.")}>Enregistrer la modification</Button>
      <fieldset disabled={pending} className="flex flex-col gap-2">
        <legend className="mb-2 font-medium">Captures de comparaison (2 à {MAX_LEARNING_CASES}, dont une indépendante)</legend>
        {reports.filter((report) => report.status === "APPROVED").map((report) => <label key={report.id} className="flex items-center gap-2">
          <input type="checkbox" checked={selected.includes(report.id)} disabled={!selected.includes(report.id) && selected.length >= MAX_LEARNING_CASES}
            onChange={(event) => setSelected((value) => event.target.checked ? [...value, report.id] : value.filter((id) => id !== report.id))} />
          {report.bookmaker} · {report.id.slice(0, 8)} · {report.correctionCount} correction(s) · {draft.sourceIds.includes(report.id) ? "source de la proposition" : "indépendante"}
        </label>)}
      </fieldset>
      <Button size="sm" variant="outline" disabled={pending || selected.length < 2 || (editedRules !== null && editedRules !== draft.rules)} onClick={() => run(async () => {
        for (let index = 0; index < selected.length; index++) {
          setProgress(`Comparaison ${index + 1}/${selected.length}…`);
          await evaluateScanImprovement(selected[index]);
        }
      }, "Comparaison terminée. Consulte les résultats avant toute activation.")}>Comparer l’actuel et la proposition</Button>
      {draft.evaluation && <>
        <p>{draft.evaluation.cases.length} capture(s) · erreurs actuelles : {verdict.baselineErrors} · proposées : {verdict.candidateErrors} · nouvelles erreurs : {verdict.regressions}.</p>
        <details><summary className="cursor-pointer">Détail des écarts par champ</summary>{draft.evaluation.cases.map((item) => <div key={item.reportId} className="mt-2 rounded bg-muted p-2">
          <p>{item.reportId.slice(0, 8)}</p><p>Actuel : {item.baselineErrors.map(errorLabel).join(", ") || "aucune erreur"}</p><p>Proposé : {item.candidateErrors.map(errorLabel).join(", ") || "aucune erreur"}</p>
        </div>)}</details>
      </>}
      <Button size="sm" disabled={pending || !verdict.canActivate || (editedRules !== null && editedRules !== draft.rules)} onClick={() => run(activateScanImprovement, "Amélioration activée pour les prochains scans.")}>Valider et activer cette version</Button>
      <p className="text-muted-foreground">Comparaison des champs extraits avec les corrections vérifiées : références, dates, montants, résultats et sélections inclus. Un gain mesuré sans nouvelle erreur est requis. Cette comparaison ne garantit pas une lecture parfaite de toutes les futures captures.</p>
    </>}
    <p role="status" aria-live="polite">{progress || message}</p>
    {error && <p role="alert" className="text-loss">{error}</p>}
  </section>;
}
