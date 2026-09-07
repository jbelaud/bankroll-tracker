import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/prisma";
import { betResultToLabel } from "@/lib/bet-result";
import { certificationStatus, certificationSummary, type CertificationStatus } from "@/lib/certification";
import { profitInUnits, publicPerformance } from "@/lib/public-bankroll";

export const metadata: Metadata = { robots: { index: false, follow: false } };

const STATUS_LABELS: Record<CertificationStatus, string> = {
  EXCLUDED: "Hors certification",
  AWAITING_RESULT: "Preuve initiale reçue",
  TIMING_UNCONFIRMED: "Horaire à confirmer",
  STRONG: "Certification forte",
  PARTIAL: "Certification partielle",
  WEAK: "Certification faible",
  LIMITED: "Preuve limitée",
  UNVERIFIED: "Non certifié",
};

const FORMAT_LABELS = { SIMPLE: "Simple", COMBINE: "Combiné", SYSTEME: "Système", BACK: "Back", LAY: "Lay" } as const;

export default async function PublicBankrollPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  const bankroll = await prisma.bankroll.findFirst({
    where: { publicSlug: slug, isPublic: true, certificationStartedAt: { not: null } },
    select: {
      name: true,
      certificationStartedAt: true,
      user: { select: { name: true } },
      bets: {
        orderBy: [{ date: "desc" }, { createdAt: "desc" }],
        select: {
          id: true, createdAt: true, date: true, sport: true, betType: true, description: true,
          eventResult: true, stakeUnits: true, odds: true, result: true, cashOutAmount: true,
          referenceCapitalAtBet: true, freebet: true, bookmaker: true, format: true,
          entryMethod: true, initialProofAt: true,
          initialProofBeforeEvent: true, resultProofAt: true, resultEntryMethod: true,
          selections: {
            orderBy: { position: "asc" },
            select: { id: true, label: true, sport: true, competition: true, betType: true, odds: true, result: true },
          },
          corrections: { select: { id: true, createdAt: true }, orderBy: { createdAt: "desc" } },
        },
      },
    },
  });
  if (!bankroll || !bankroll.certificationStartedAt) notFound();

  const certification = certificationSummary(bankroll.bets, bankroll.certificationStartedAt);
  const performance = publicPerformance(bankroll.bets);
  const number = new Intl.NumberFormat(locale, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  const date = new Intl.DateTimeFormat(locale, { day: "2-digit", month: "2-digit", year: "numeric" });

  return (
    <main className="min-h-dvh bg-background px-4 py-6 text-foreground sm:px-6 lg:px-10">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-5">
        <header className="flex items-center justify-between gap-4">
          <Link href="/" className="text-lg font-bold tracking-tight">Kalivoa</Link>
          <span className="rounded-full border border-profit/30 bg-profit/10 px-3 py-1 text-xs font-semibold text-profit">Bankroll publique</span>
        </header>

        <section className="glass-card rounded-2xl p-5 sm:p-6">
          <p className="text-sm text-muted-foreground">{bankroll.user.name || "Tipster Kalivoa"}</p>
          <h1 className="mt-1 text-2xl font-bold">{bankroll.name}</h1>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">Kalivoa rend visible le niveau de preuve derrière chaque pari. La plateforme ne certifie pas le montant réel détenu par le tipster.</p>
          <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <PublicMetric label="Bankroll normalisée" value={performance.normalizedBalance === null ? "À compléter" : `${number.format(performance.normalizedBalance)}u`} />
            <PublicMetric label="Performance" value={performance.profit === null ? "À compléter" : `${performance.profit >= 0 ? "+" : ""}${number.format(performance.profit)}u`} tone={performance.profit === null ? "neutral" : performance.profit >= 0 ? "profit" : "loss"} />
            <PublicMetric label="ROI" value={performance.roi === null ? "—" : `${number.format(performance.roi)}%`} />
            <PublicMetric label="Score de preuve" value={certification.score === null ? "En observation" : `${certification.score}/100`} />
          </div>
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            <PublicMetric label="Paris dans l’historique" value={String(bankroll.bets.length)} />
            <PublicMetric label="Volume complet" value={`${certification.strongVolumePercent}%`} />
            <PublicMetric label="Paris complets" value={`${certification.strongBetPercent}%`} />
          </div>
        </section>

        <section className="glass-card rounded-2xl p-5 sm:p-6">
          <div>
            <h2 className="text-lg font-semibold">Résultats et performances</h2>
            <p className="text-sm text-muted-foreground">Toutes les statistiques publiques sont calculées en unités, jamais avec les montants réels.</p>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            <PublicMetric label="Gagnés" value={String(performance.results.won)} tone="profit" />
            <PublicMetric label="Perdus" value={String(performance.results.lost)} tone="loss" />
            <PublicMetric label="Remboursés" value={String(performance.results.refunded)} />
            <PublicMetric label="Cashés" value={String(performance.results.cashed)} />
            <PublicMetric label="En attente" value={String(performance.results.pending)} tone="warning" />
            <PublicMetric label="Taux de réussite" value={performance.winRate === null ? "—" : `${number.format(performance.winRate)}%`} />
          </div>
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            <PublicMetric label="Volume total renseigné" value={`${number.format(performance.totalVolume)}u`} />
            <PublicMetric label="Cote moyenne" value={performance.averageOdds === null ? "—" : number.format(performance.averageOdds)} />
            <PublicMetric label="Unités renseignées" value={`${performance.unitBetCount}/${bankroll.bets.length} paris`} tone={performance.missingUnitCount > 0 ? "warning" : "profit"} />
          </div>
          {performance.missingUnitCount > 0 ? <p className="mt-3 rounded-xl border border-warning/30 bg-warning/10 p-3 text-sm leading-relaxed text-warning">{performance.missingUnitCount} pari(s) historique(s) n’ont pas encore d’unité renseignée. Ils restent visibles, mais sont exclus des calculs de performance en unités.</p> : null}
        </section>

        <section className="space-y-3">
          <div>
            <h2 className="text-lg font-semibold">Paris publics</h2>
            <p className="text-sm text-muted-foreground">Mises affichées uniquement en unités · cotes décimales.</p>
          </div>
          {bankroll.bets.length === 0 ? <div className="glass-card rounded-2xl p-8 text-center text-sm text-muted-foreground">Aucun pari dans cette bankroll.</div> : (
            <ul className="grid gap-3">
              {bankroll.bets.map((bet) => {
                const status = certificationStatus(bet, bankroll.certificationStartedAt);
                const canCalculateProfit = bet.stakeUnits !== null
                  && bet.result !== "EN_ATTENTE"
                  && (bet.result !== "CASHE" || Boolean(bet.referenceCapitalAtBet));
                const profit = canCalculateProfit ? profitInUnits(bet) : null;
                return <li key={bet.id} className="glass-card rounded-2xl p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <strong>{bet.description || `${bet.sport} · ${bet.betType}`}</strong>
                        <span className={`rounded-full px-2 py-1 text-[0.65rem] font-semibold ${resultTone(bet.result)}`}>{betResultToLabel(bet.result)}</span>
                        <span className="rounded-full bg-primary/10 px-2 py-1 text-[0.65rem] font-semibold text-primary">{STATUS_LABELS[status]}</span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{date.format(bet.date)} · {FORMAT_LABELS[bet.format]} · {bet.sport} · {bet.betType}{bet.bookmaker ? ` · ${bet.bookmaker}` : ""}</p>
                      {bet.eventResult ? <p className="mt-1 text-sm text-muted-foreground">Résultat de l’événement : {bet.eventResult}</p> : null}
                      {bet.selections.length > 0 ? <ol className="mt-3 space-y-1 rounded-xl border border-border bg-background/30 p-3 text-xs">
                        {bet.selections.map((selection, index) => <li key={selection.id} className="flex items-start justify-between gap-3">
                          <span><strong>{index + 1}. {selection.label}</strong><span className="block text-muted-foreground">{[selection.sport, selection.competition, selection.betType].filter(Boolean).join(" · ")}</span></span>
                          <span className="shrink-0 text-right"><span className="num block">{selection.odds === null ? "—" : number.format(selection.odds)}</span>{selection.result ? <span className={`mt-1 inline-block rounded-full px-1.5 py-0.5 text-[0.6rem] font-semibold ${resultTone(selection.result)}`}>{betResultToLabel(selection.result)}</span> : null}</span>
                        </li>)}
                      </ol> : null}
                      {bet.corrections.length ? <p className="mt-2 text-xs text-warning">{bet.corrections.length} correction(s) tracée(s)</p> : null}
                    </div>
                    <div className="grid shrink-0 grid-cols-2 gap-x-4 gap-y-3 text-right sm:grid-cols-4">
                      <MiniMetric label="Mise" value={bet.stakeUnits === null ? "Non renseignée" : `${number.format(bet.stakeUnits)}u`} />
                      <MiniMetric label="Cote" value={bet.odds === null ? "—" : number.format(bet.odds)} />
                      <MiniMetric label="Résultat" value={betResultToLabel(bet.result)} tone={bet.result === "GAGNE" ? "profit" : bet.result === "PERDU" ? "loss" : "neutral"} />
                      <MiniMetric label="Bénéfice" value={profit === null ? "—" : `${profit >= 0 ? "+" : ""}${number.format(profit)}u`} tone={profit === null ? "neutral" : profit >= 0 ? "profit" : "loss"} />
                    </div>
                  </div>
                </li>;
              })}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}

type MetricTone = "neutral" | "profit" | "loss" | "warning";

function toneClass(tone: MetricTone) {
  return tone === "profit" ? "text-profit" : tone === "loss" ? "text-loss" : tone === "warning" ? "text-warning" : "text-foreground";
}

function resultTone(result: "EN_ATTENTE" | "GAGNE" | "PERDU" | "REMBOURSE" | "CASHE") {
  return result === "GAGNE" ? "bg-profit/15 text-profit"
    : result === "PERDU" ? "bg-loss/15 text-loss"
      : result === "EN_ATTENTE" ? "bg-warning/15 text-warning"
        : result === "CASHE" ? "bg-primary/15 text-primary"
          : "bg-muted text-muted-foreground";
}

function PublicMetric({ label, value, tone = "neutral" }: { label: string; value: string; tone?: MetricTone }) {
  return <div className="rounded-xl border border-border bg-background/35 p-3"><span className="block text-[0.65rem] uppercase tracking-wide text-muted-foreground">{label}</span><strong className={`num mt-1 block text-base ${toneClass(tone)}`}>{value}</strong></div>;
}

function MiniMetric({ label, value, tone = "neutral" }: { label: string; value: string; tone?: MetricTone }) {
  return <div><span className="block text-[0.6rem] uppercase text-muted-foreground">{label}</span><strong className={`num mt-1 block whitespace-nowrap text-xs ${toneClass(tone)}`}>{value}</strong></div>;
}
