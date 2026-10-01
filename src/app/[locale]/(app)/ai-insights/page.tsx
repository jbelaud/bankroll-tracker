import type { ReactNode } from "react";
import { Sparkle, ChartBar, Wallet, TrendUp } from "@phosphor-icons/react/dist/ssr";
import { getLocale, getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { listBankrolls } from "@/lib/actions/bankrolls";
import { listAllBets } from "@/lib/actions/bets";
import { isPaidPlan } from "@/lib/billing/plans";
import { computeGlobalStats } from "@/lib/stats";
import { computeClv } from "@/lib/clv";
import { fmtPct } from "@/lib/format";
import { INSIGHTS_COOLDOWN_MS, type InsightResult } from "@/lib/insights/types";
import { InsightsCard } from "@/components/stats/insights-card";
import { PremiumInsightsCard } from "@/components/stats/premium-insights-card";
import { Link } from "@/i18n/navigation";

export default async function AiInsightsPage() {
  const user = await requireUser();
  // Ces lectures restent séquentielles pour le pool de connexion de production.
  const bankrolls = await listBankrolls();
  const allBets = await listAllBets();
  const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { plan: true } });
  const existingInsight = await prisma.insight.findUnique({ where: { userId: user.id } });

  const activeBankrolls = bankrolls.filter((bankroll) => !bankroll.locked);
  const activeIds = new Set(activeBankrolls.map((bankroll) => bankroll.id));
  const bets = allBets.filter((bet) => activeIds.has(bet.bankrollId));
  const stats = computeGlobalStats(bets);
  const clv = computeClv(bets);
  const paidPlan = isPaidPlan(dbUser?.plan ?? "FREE");
  const visibleInsight = paidPlan && bankrolls.every((bankroll) => !bankroll.locked) ? existingInsight : null;
  const cooldownUntil = visibleInsight ? visibleInsight.generatedAt.getTime() + INSIGHTS_COOLDOWN_MS : null;
  const [t, locale] = await Promise.all([getTranslations("aiInsights"), getLocale()]);

  return (
    <div className="flex min-w-0 flex-col gap-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">{t("eyebrow")}</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">{t("title")}</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <span className="rounded-full border border-border bg-muted/30 px-3 py-1.5 text-xs text-muted-foreground">
          {t("scope", { bankrolls: activeBankrolls.length, bets: bets.length })}
        </span>
      </header>

      <section className="rounded-2xl border border-primary/30 bg-linear-to-br from-primary/12 via-background to-background p-4 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground"><Sparkle size={20} weight="fill" aria-hidden /></span>
          <div>
            <h2 className="text-lg font-semibold">{t("reportTitle")}</h2>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{t("reportDescription")}</p>
          </div>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-3">
        <SummaryMetric icon={<Wallet size={18} aria-hidden />} label={t("bets")} value={String(bets.length)} detail={t("betsDetail", { count: stats.performanceBets })} />
        <SummaryMetric icon={<TrendUp size={18} aria-hidden />} label={t("roi")} value={stats.roi === null ? "—" : fmtPct(stats.roi, locale)} detail={t("roiDetail")} />
        <SummaryMetric icon={<ChartBar size={18} aria-hidden />} label={t("clvCoverage")} value={`${clv.measured}/${clv.candidates}`} detail={t("clvDetail")} />
      </div>

      {paidPlan ? (
        <InsightsCard
          settledCount={stats.performanceBets}
          initialInsight={visibleInsight ? (visibleInsight.data as unknown as InsightResult) : null}
          initialCooldownUntil={cooldownUntil}
        />
      ) : <PremiumInsightsCard />}

      <div className="flex flex-wrap gap-2">
        <Link href="/stats" className="inline-flex min-h-touch items-center rounded-xl border border-border bg-card px-4 text-sm font-semibold hover:border-primary/40 hover:text-primary">{t("analyzeLink")}</Link>
        <Link href="/bankrolls" className="inline-flex min-h-touch items-center rounded-xl border border-border bg-card px-4 text-sm font-semibold hover:border-primary/40 hover:text-primary">{t("bankrollsLink")}</Link>
      </div>
      <p className="text-xs leading-relaxed text-muted-foreground">{t("limits")}</p>
    </div>
  );
}

function SummaryMetric({ icon, label, value, detail }: { icon: ReactNode; label: string; value: string; detail: string }) {
  return <div className="glass-card rounded-xl p-4">
    <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">{icon}{label}</div>
    <strong className="num mt-2 block text-2xl font-semibold">{value}</strong>
    <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
  </div>;
}
