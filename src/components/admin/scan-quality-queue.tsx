"use client";

import { type FormEvent, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { ScanLearningPanel } from "./scan-learning-panel";
import { ScanReferenceFields } from "./scan-reference-fields";
import type { ParsedBet } from "@/lib/scan/types";
import { COMMON_SCAN_PROFILE } from "@/lib/scan/learning";
import { saveScanReference } from "@/lib/actions/scan-learning";
import {
  saveBookmakerScanProfile,
  setBookmakerSupport,
  updateScanQualityReport,
} from "@/lib/actions/scan-quality";

type Report = {
  id: string;
  bookmaker: string;
  status: "NEW" | "REVIEWED" | "APPROVED" | "REJECTED" | "RESOLVED";
  correctionCount: number;
  model: string;
  createdAt: string;
  rawExtraction: unknown;
  finalExtraction: unknown;
  correctionTypes: string[];
  adminNotes?: string | null;
  issueDetails?: string | null;
};

type Profile = {
  bookmaker: string;
  supportStatus: "TESTED" | "UNTESTED" | "VALIDATING";
  rules: string;
  examplesText: string;
  version: number;
  updatedAt: string;
};

export function ScanQualityQueue({
  reports,
  counts,
  profiles,
  locale,
}: {
  reports: Report[];
  counts: { bookmaker: string; count: number }[];
  profiles: Profile[];
  locale: string;
}) {
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState<string | null>(null);
  const [bookmaker, setBookmaker] = useState("");
  const [rules, setRules] = useState("");
  const [examples, setExamples] = useState("");
  const [formError, setFormError] = useState("");
  const [referenceId, setReferenceId] = useState<string | null>(null);
  const [referenceBets, setReferenceBets] = useState<ParsedBet[]>([]);
  const [referenceNote, setReferenceNote] = useState("");
  const commonProfile = profiles.find((profile) => profile.bookmaker === COMMON_SCAN_PROFILE);
  const editingProfile = profiles.find((profile) => profile.bookmaker === bookmaker.trim().replace(/\s+/g, " "));
  const dateFormat = new Intl.DateTimeFormat(locale, { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Paris" });

  const openEditor = (target: string) => {
    const profile = profiles.find((item) => item.bookmaker === target);
    setEditing(target);
    setBookmaker(target);
    setRules(profile?.rules ?? "");
    setExamples(profile?.examplesText ?? "");
    setFormError("");
  };

  const saveProfile = (event: FormEvent) => {
    event.preventDefault();
    if (editingProfile && (editingProfile.rules !== rules.trim() || editingProfile.examplesText !== examples.trim())) {
      const confirmed = window.confirm(
        `Le profil ${editingProfile.bookmaker} passera de v${editingProfile.version} à v${editingProfile.version + 1}. Les règles actuelles restent dans l'historique. Continuer ?`
      );
      if (!confirmed) return;
    }
    startTransition(async () => {
      try {
        await saveBookmakerScanProfile(bookmaker, rules, examples);
        setEditing(null);
      } catch (error) {
        setFormError(error instanceof Error ? error.message : "Impossible d’enregistrer le profil.");
      }
    });
  };

  return (
    <section className="flex flex-col gap-3">
      <div>
        <h2 className="text-sm font-semibold">Qualité des scans</h2>
        <p className="mt-1 text-xs text-muted-foreground">Captures privées, consultables par les administrateurs autorisés uniquement.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {counts.map((item) => <span key={item.bookmaker} className="rounded-full bg-muted px-2 py-1 text-xs">{item.bookmaker} · {item.count}</span>)}
      </div>
      <div className="flex flex-wrap gap-2">
        {profiles.filter((profile) => profile.bookmaker !== COMMON_SCAN_PROFILE).map((profile) => <Button key={profile.bookmaker} size="xs" variant="outline" disabled={pending} onClick={() => openEditor(profile.bookmaker)}>Exceptions {profile.bookmaker} · v{profile.version}</Button>)}
        <Button size="xs" variant="outline" disabled={pending} onClick={() => openEditor("")}>Créer un profil</Button>
      </div>

      <ScanLearningPanel activeRules={commonProfile?.rules ?? ""} examples={commonProfile?.examplesText ? JSON.parse(commonProfile.examplesText) : null}
        active={commonProfile?.supportStatus === "TESTED"} reports={reports} />

      {editing !== null && (
        <form onSubmit={saveProfile} className="glass-card flex flex-col gap-3 rounded-xl p-3 text-xs">
          <h3 className="font-semibold">Profil bookmaker versionné</h3>
          {editingProfile && (
            <details className="rounded border border-border p-2"><summary className="cursor-pointer font-medium">Comparer v{editingProfile.version} à la proposition</summary><div className="mt-2 grid gap-2 md:grid-cols-2"><div><p className="mb-1 font-medium">Règles actuelles</p><pre className="max-h-32 overflow-auto whitespace-pre-wrap rounded bg-muted p-2">{editingProfile.rules || "—"}</pre></div><div><p className="mb-1 font-medium">Règles proposées</p><pre className="max-h-32 overflow-auto whitespace-pre-wrap rounded bg-muted p-2">{rules || "—"}</pre></div></div></details>
          )}
          <label className="flex flex-col gap-1">Bookmaker<input required maxLength={100} value={bookmaker} onChange={(event) => setBookmaker(event.target.value)} className="rounded border border-border bg-background p-2" /></label>
          <label className="flex flex-col gap-1">Règles spécifiques validées<textarea maxLength={20_000} value={rules} onChange={(event) => setRules(event.target.value)} className="min-h-28 rounded border border-border bg-background p-2" placeholder="Règles utilisées dans le prompt uniquement après validation admin." /></label>
          <label className="flex flex-col gap-1">Exemples validés (JSON facultatif)<textarea value={examples} onChange={(event) => setExamples(event.target.value)} className="min-h-24 rounded border border-border bg-background p-2 font-mono" placeholder='[{"ticket":"…","résultat":"…"}]' /></label>
          {formError && <p role="alert" className="text-loss">{formError}</p>}
          <div className="flex gap-2">
            <Button size="sm" type="submit" disabled={pending}>Enregistrer et versionner</Button>
            <Button size="sm" type="button" variant="outline" disabled={pending} onClick={() => setEditing(null)}>Annuler</Button>
          </div>
        </form>
      )}

      {reports.length === 0 ? <p className="glass-card rounded-xl p-4 text-sm text-muted-foreground">Aucun rapport à examiner.</p> : reports.map((report) => (
        <article key={report.id} className="glass-card flex flex-col gap-3 rounded-xl p-3 text-xs">
          <div className="flex items-center justify-between gap-2"><strong>{report.bookmaker}</strong><span>{report.status} · {report.correctionCount} correction(s)</span></div>
          <p className="text-muted-foreground">{dateFormat.format(new Date(report.createdAt))} · {report.model}{report.correctionTypes.length ? ` · ${report.correctionTypes.join(", ")}` : ""}</p>
          <p className="text-muted-foreground">Rapport {report.id.slice(0, 8)}{report.issueDetails ? ` · ${report.issueDetails}` : ""}</p>
          {report.adminNotes && <p>Note interne : {report.adminNotes}</p>}
          <a href={`/api/admin/scan-quality/${encodeURIComponent(report.id)}/image`} target="_blank" rel="noreferrer" className="text-primary underline">Ouvrir la capture sécurisée</a>
          <details><summary className="cursor-pointer font-medium">Comparer l&apos;extraction et la correction</summary><div className="mt-2 grid gap-2 md:grid-cols-2"><pre className="overflow-auto rounded bg-muted p-2">{JSON.stringify(report.rawExtraction, null, 2)}</pre><pre className="overflow-auto rounded bg-muted p-2">{JSON.stringify(report.finalExtraction, null, 2)}</pre></div></details>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" disabled={pending} onClick={() => startTransition(() => updateScanQualityReport(report.id, "REVIEWED"))}>Consulté</Button>
            <Button size="sm" disabled={pending} onClick={() => {
              setReferenceId(report.id); setReferenceBets(Array.isArray(report.finalExtraction) ? report.finalExtraction as ParsedBet[] : []);
              setReferenceNote(report.adminNotes ?? ""); setFormError("");
            }}>Corriger et valider l’exemple</Button>
            <Button size="sm" variant="outline" disabled={pending} onClick={() => startTransition(() => updateScanQualityReport(report.id, "REJECTED"))}>Ignorer</Button>
            <Button size="sm" variant="outline" disabled={pending} onClick={() => {
              const note = window.prompt("Note interne (2 000 caractères maximum)");
              if (note !== null) startTransition(() => updateScanQualityReport(report.id, report.status, note));
            }}>Ajouter une note</Button>
            <Button size="sm" variant="outline" disabled={pending} onClick={() => startTransition(() => setBookmakerSupport(report.bookmaker, "VALIDATING"))}>En validation</Button>
            <Button size="sm" variant="outline" disabled={pending} onClick={() => startTransition(() => setBookmakerSupport(report.bookmaker, "TESTED"))}>Marquer supporté</Button>
            <Button size="sm" variant="outline" disabled={pending} onClick={() => openEditor(report.bookmaker)}>Éditer les règles</Button>
          </div>
          {referenceId === report.id && <form className="flex flex-col gap-2" onSubmit={(event) => {
            event.preventDefault(); startTransition(async () => {
              try { await saveScanReference(report.id, JSON.stringify(referenceBets), referenceNote); setReferenceId(null); }
              catch (error) { setFormError(error instanceof Error ? error.message : "Correction impossible."); }
            });
          }}>
            <p>Vérifie chaque champ sur la capture avant validation. Tu peux aussi reporter ici une correction reçue en privé. Un retour utilisateur seul ne suffit pas.</p>
            <ScanReferenceFields bets={referenceBets} onChange={setReferenceBets} disabled={pending} />
            <label className="flex flex-col gap-1">Note interne<textarea maxLength={2_000} value={referenceNote} onChange={(event) => setReferenceNote(event.target.value)} className="rounded border border-border bg-background p-2" /></label>
            {formError && <p role="alert" className="text-loss">{formError}</p>}
            <div className="flex gap-2"><Button size="sm" disabled={pending} type="submit">J’ai vérifié la capture : valider</Button><Button size="sm" disabled={pending} variant="outline" type="button" onClick={() => setReferenceId(null)}>Annuler</Button></div>
          </form>}
        </article>
      ))}
    </section>
  );
}
