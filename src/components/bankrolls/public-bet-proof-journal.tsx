import type { BetCorrectionKind } from "@prisma/client";
import type { CertificationStatus } from "@/lib/certification";

const CORRECTION_FIELD_LABELS: Record<string, string> = {
  bookmaker: "bookmaker", ticketReferenceCorrected: "référence du ticket",
  initialProofAt: "scan initial", initialProofBeforeEvent: "avant l’événement", resultProofReviewed: "résultat scanné",
  sport: "sport", betType: "type de pari", description: "sélection", eventResult: "résultat de l’événement",
  date: "date", stakeUnits: "mise en unités", odds: "cote", result: "résultat", cashOutUnits: "cash out en unités",
  boosted: "boost", originalOdds: "cote initiale", freebet: "freebet", live: "pari en direct",
};

type PublicCorrection = {
  kind: BetCorrectionKind;
  before: unknown;
  after: unknown;
  createdAt: Date;
};

function isJsonObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function correctionFields(before: unknown, after: unknown) {
  if (!isJsonObject(before) || !isJsonObject(after)) return [];
  return Object.entries(CORRECTION_FIELD_LABELS)
    .filter(([key]) => JSON.stringify(before[key]) !== JSON.stringify(after[key]))
    .map(([, label]) => label);
}

export function PublicBetProofJournal({
  locale, proofStatus, initialProofAt, initialProofBeforeEvent, resultProofAt, corrections,
}: {
  locale: string;
  proofStatus: CertificationStatus;
  initialProofAt: Date | null;
  initialProofBeforeEvent: boolean | null;
  resultProofAt: Date | null;
  corrections: PublicCorrection[];
}) {
  const proofCount = Number(Boolean(initialProofAt)) + Number(Boolean(resultProofAt));
  const day = new Intl.DateTimeFormat(locale, { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Europe/Paris" });
  const timestamp = new Intl.DateTimeFormat(locale, { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" });

  return <details className="mt-2 rounded-lg border border-border bg-background/30 px-1">
    <summary className="flex min-h-touch cursor-pointer list-none items-center rounded-md px-2 text-[0.7rem] font-semibold text-primary marker:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary [&::-webkit-details-marker]:hidden">
      Journal de transparence · {proofCount} scan(s) · {corrections.length} correction(s)
    </summary>
    <div className="space-y-2 border-t border-border px-2 py-2 text-[0.7rem] leading-relaxed text-muted-foreground">
      {initialProofAt ? <p>
        <strong className="text-foreground">Scan initial enregistré</strong> le {timestamp.format(initialProofAt)} (heure de Paris)
        {initialProofBeforeEvent === true ? " · avant l’événement confirmé" : " · chronologie avant l’événement non établie"}.
      </p> : null}
      {resultProofAt ? <p><strong className="text-foreground">Capture du résultat enregistrée</strong> le {timestamp.format(resultProofAt)} (heure de Paris).</p> : null}
      {proofStatus === "LIMITED" ? <p>Preuve limitée : le résultat a été scanné, mais aucun scan initial avant l’événement n’est confirmé.</p> : null}
      {proofCount === 0 && corrections.length === 0 ? <p>Aucun scan de preuve ni correction enregistré pour ce pari.</p> : null}
      {corrections.length > 0 ? <ul className="space-y-1.5 border-t border-border pt-2">
        {corrections.map((correction, index) => {
          const fields = correctionFields(correction.before, correction.after);
          return <li key={`${correction.createdAt.toISOString()}-${index}`}>
            <strong className="text-foreground">{correction.kind === "RESULT_MANUAL" ? "Résultat renseigné manuellement" : isJsonObject(correction.after) && correction.after.proofReviewVerified === true ? "Preuves du scan vérifiées" : "Pari corrigé"}</strong>
            {` le ${day.format(correction.createdAt)}`}
            {fields.length > 0 ? ` · ${fields.join(", ")}` : ""}
          </li>;
        })}
      </ul> : null}
    </div>
  </details>;
}
