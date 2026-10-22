"use client";

import { Button } from "@/components/ui/button";
import { BET_RESULT_LABELS } from "@/lib/bet-result";
import type { ParsedBet, ParsedBetSelection } from "@/lib/scan/types";

const inputClass = "min-h-10 rounded border border-border bg-background p-2";
const textFields = [["ticketRef", "Numéro du pari"], ["date", "Date de prise du pari"], ["sport", "Sport"],
  ["betType", "Type de pari"], ["description", "Sélection jouée et participants"], ["eventResult", "Résultat de l’événement"], ["tipster", "Tipster visible"]] as const;
const numberFields = [["stake", "Mise"], ["odds", "Cote"], ["originalOdds", "Ancienne cote"],
  ["cashOutAmount", "Montant du cashout effectué"], ["closingOdds", "Cote de clôture"]] as const;

export function ScanReferenceFields({ bets, onChange, disabled }: {
  bets: ParsedBet[]; onChange: (bets: ParsedBet[]) => void; disabled: boolean;
}) {
  const patch = (index: number, value: Partial<ParsedBet>) => onChange(bets.map((bet, i) => i === index ? { ...bet, ...value } : bet));
  const selectionPatch = (index: number, selectionIndex: number, value: Partial<ParsedBetSelection>) => patch(index, {
    selections: bets[index].selections?.map((selection, i) => i === selectionIndex ? { ...selection, ...value } : selection),
  });
  return <fieldset disabled={disabled} className="flex flex-col gap-3">
    <legend className="mb-2 font-medium">Informations vérifiées sur la capture</legend>
    {bets.map((bet, index) => <div key={index} className="flex flex-col gap-3 rounded border border-border p-3">
      <div className="flex items-center justify-between"><strong>Pari {index + 1}</strong><Button type="button" size="xs" variant="outline" onClick={() => onChange(bets.filter((_, i) => i !== index))}>Retirer ce pari</Button></div>
      <div className="grid gap-2 sm:grid-cols-2">
        {textFields.map(([field, label]) => <label key={field} className="flex flex-col gap-1">{label}<input type={field === "date" ? "date" : "text"}
          className={inputClass} value={bet[field] ?? ""} maxLength={2_000}
          onChange={(event) => patch(index, { [field]: event.target.value || (["sport", "betType", "description"].includes(field) ? "" : null) })} /></label>)}
        {numberFields.map(([field, label]) => <label key={field} className="flex flex-col gap-1">{label}<input type="number" step="any" min={0}
          className={inputClass} value={bet[field] ?? ""} onChange={(event) => patch(index, { [field]: event.target.value === "" ? null : Number(event.target.value) })} /></label>)}
        <label className="flex flex-col gap-1">Statut du ticket<select className={inputClass} value={bet.result} onChange={(event) => patch(index, { result: event.target.value as ParsedBet["result"] })}>
          {Object.entries(BET_RESULT_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select></label>
        <label className="flex flex-col gap-1">Format<select className={inputClass} value={bet.format ?? "SIMPLE"} onChange={(event) => patch(index, { format: event.target.value as ParsedBet["format"] })}>
          {[["SIMPLE", "Simple"], ["COMBINE", "Combiné"], ["SYSTEME", "Système"], ["BACK", "Back"], ["LAY", "Lay"]].map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select></label>
      </div>
      <div className="flex flex-wrap gap-3">{([["boosted", "Cote boostée"], ["freebet", "Freebet"], ["live", "Placé en live"]] as const).map(([field, label]) =>
        <label key={field} className="flex items-center gap-2"><input type="checkbox" checked={bet[field]} onChange={(event) => patch(index, { [field]: event.target.checked })} />{label}</label>)}</div>
      <details><summary className="cursor-pointer font-medium">Détail des sélections ({bet.selections?.length ?? 0})</summary>
        {bet.selections?.map((selection, selectionIndex) => <div key={selectionIndex} className="mt-2 grid gap-2 rounded bg-muted p-2 sm:grid-cols-2">
          {([["label", "Sélection"], ["sport", "Sport"], ["betType", "Marché"], ["competition", "Compétition"]] as const).map(([field, label]) =>
            <label key={field} className="flex flex-col gap-1">{label}<input className={inputClass} value={selection[field] ?? ""} onChange={(event) => selectionPatch(index, selectionIndex, { [field]: event.target.value })} /></label>)}
          <label className="flex flex-col gap-1">Cote individuelle<input className={inputClass} type="number" min={1} step="any" value={selection.odds ?? ""} onChange={(event) => selectionPatch(index, selectionIndex, { odds: event.target.value === "" ? null : Number(event.target.value) })} /></label>
          <label className="flex flex-col gap-1">Résultat de la sélection<select className={inputClass} value={selection.result ?? ""} onChange={(event) => selectionPatch(index, selectionIndex, { result: (event.target.value || null) as ParsedBetSelection["result"] })}>
            <option value="">Non visible</option>{Object.entries(BET_RESULT_LABELS).filter(([value]) => value !== "CASHE").map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select></label>
          <Button type="button" size="xs" variant="outline" onClick={() => patch(index, { selections: bet.selections!.filter((_, i) => i !== selectionIndex) })}>Retirer cette sélection</Button>
        </div>)}
        <Button type="button" size="xs" variant="outline" className="mt-2" onClick={() => patch(index, { selections: [...(bet.selections ?? []), { sport: bet.sport, competition: null, betType: null, label: "", odds: null, result: null }] })}>Ajouter une sélection visible</Button>
      </details>
    </div>)}
    <Button type="button" size="sm" variant="outline" onClick={() => onChange([...bets, {
      ticketRef: null, date: null, sport: "", betType: "", description: "", eventResult: null, stake: null,
      odds: null, boosted: false, originalOdds: null, freebet: false, live: false, result: "EN_ATTENTE",
      cashOutAmount: null, format: "SIMPLE", selections: [],
    }])}>Ajouter un pari manquant</Button>
  </fieldset>;
}
