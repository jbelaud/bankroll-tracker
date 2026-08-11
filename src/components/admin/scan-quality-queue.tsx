"use client";

import { type FormEvent, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
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
  imageUrl: string | null;
  rawExtraction: unknown;
  finalExtraction: unknown;
  correctionTypes: string[];
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
}: {
  reports: Report[];
  counts: { bookmaker: string; count: number }[];
  profiles: Profile[];
}) {
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState<string | null>(null);
  const [bookmaker, setBookmaker] = useState("");
  const [rules, setRules] = useState("");
  const [examples, setExamples] = useState("");
  const [formError, setFormError] = useState("");

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
        {profiles.map((profile) => <Button key={profile.bookmaker} size="xs" variant="outline" disabled={pending} onClick={() => openEditor(profile.bookmaker)}>Règles {profile.bookmaker} · v{profile.version}</Button>)}
        <Button size="xs" variant="outline" disabled={pending} onClick={() => openEditor("")}>Créer un profil</Button>
      </div>

      {editing !== null && (
        <form onSubmit={saveProfile} className="glass-card flex flex-col gap-3 rounded-xl p-3 text-xs">
          <h3 className="font-semibold">Règles validées pour ce bookmaker</h3>
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
          <p className="text-muted-foreground">{new Date(report.createdAt).toLocaleString()} · {report.model}{report.correctionTypes.length ? ` · ${report.correctionTypes.join(", ")}` : ""}</p>
          {report.imageUrl && <a href={report.imageUrl} target="_blank" rel="noreferrer" className="text-primary underline">Ouvrir la capture (URL signée 60 s)</a>}
          <details><summary className="cursor-pointer font-medium">Comparer l&apos;extraction et la correction</summary><div className="mt-2 grid gap-2 md:grid-cols-2"><pre className="overflow-auto rounded bg-muted p-2">{JSON.stringify(report.rawExtraction, null, 2)}</pre><pre className="overflow-auto rounded bg-muted p-2">{JSON.stringify(report.finalExtraction, null, 2)}</pre></div></details>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" disabled={pending} onClick={() => startTransition(() => updateScanQualityReport(report.id, "REVIEWED"))}>Consulté</Button>
            <Button size="sm" disabled={pending} onClick={() => startTransition(() => updateScanQualityReport(report.id, "APPROVED"))}>Utile</Button>
            <Button size="sm" variant="outline" disabled={pending} onClick={() => startTransition(() => updateScanQualityReport(report.id, "REJECTED"))}>Ignorer</Button>
            <Button size="sm" variant="outline" disabled={pending} onClick={() => {
              const note = window.prompt("Note interne (2 000 caractères maximum)");
              if (note !== null) startTransition(() => updateScanQualityReport(report.id, report.status, note));
            }}>Ajouter une note</Button>
            <Button size="sm" variant="outline" disabled={pending} onClick={() => startTransition(() => setBookmakerSupport(report.bookmaker, "VALIDATING"))}>En validation</Button>
            <Button size="sm" variant="outline" disabled={pending} onClick={() => startTransition(() => setBookmakerSupport(report.bookmaker, "TESTED"))}>Marquer supporté</Button>
            <Button size="sm" variant="outline" disabled={pending} onClick={() => openEditor(report.bookmaker)}>Éditer les règles</Button>
          </div>
        </article>
      ))}
    </section>
  );
}
