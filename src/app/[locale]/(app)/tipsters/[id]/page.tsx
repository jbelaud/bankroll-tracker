import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTipsterPerformance } from "@/lib/tipsters/analytics";
import { listAllBets } from "@/lib/actions/bets";
import { listBankrolls } from "@/lib/actions/bankrolls";
import { listTipsters } from "@/lib/actions/tipsters";
import { getUserTaxonomy } from "@/lib/taxonomy";
import { computeProfit } from "@/lib/profit";
import { fmtDateWithYear, fmtMoney, fmtMoneySigned, fmtPct } from "@/lib/format";
import { Link } from "@/i18n/navigation";
import { ProfitCurve } from "@/components/stats/profit-curve";
import { HistoryList, type HistoryBetItemData } from "@/components/history/history-list";
import { TipsterCostEditor } from "@/components/tipsters/tipster-cost-editor";
import { TipsterPeriodFilter } from "@/components/tipsters/tipster-period-filter";

function validDate(value: string): Date | undefined {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: "profit" | "loss" }) {
  return <div className="glass-card rounded-xl p-3"><p className="text-[0.65rem] font-medium uppercase tracking-wider text-muted-foreground">{label}</p><p className={`num mt-1 text-lg font-semibold ${tone === "profit" ? "text-profit" : tone === "loss" ? "text-loss" : ""}`}>{value}</p></div>;
}

export default async function TipsterDetailPage({ params, searchParams }: PageProps<"/[locale]/tipsters/[id]">) {
  const [{ id }, query, user] = await Promise.all([params, searchParams, requireUser()]);
  const fromValue = typeof query.from === "string" ? query.from : "";
  const toValue = typeof query.to === "string" ? query.to : "";
  const from = validDate(fromValue);
  const to = validDate(toValue);

  const [tipster, allBets, bankrolls, taxonomy, tipsters, t, locale] = await Promise.all([
    prisma.tipster.findFirst({
      where: { id, userId: user.id },
      select: {
        id: true, name: true, status: true,
        user: { select: { currency: true } },
        costPeriods: { orderBy: [{ startDate: "desc" }, { createdAt: "desc" }] },
      },
    }),
    listAllBets(),
    listBankrolls(),
    getUserTaxonomy(user.id),
    listTipsters({ includeArchived: true }),
    getTranslations("tipsters.detail"),
    getLocale(),
  ]);
  if (!tipster) notFound();

  const activeBankrolls = bankrolls.filter((bankroll) => !bankroll.locked);
  const activeIds = new Set(activeBankrolls.map((bankroll) => bankroll.id));
  const scopedBets = allBets.filter((bet) => {
    const day = bet.date.toISOString().slice(0, 10);
    return bet.tipsterId === id && activeIds.has(bet.bankrollId)
      && (!fromValue || day >= fromValue) && (!toValue || day <= toValue);
  });
  const performance = await getTipsterPerformance({
    userId: user.id,
    tipsterId: id,
    betIds: scopedBets.map((bet) => bet.id),
    from,
    to,
  });
  if (!performance) notFound();

  const bankrollName = new Map(activeBankrolls.map((bankroll) => [bankroll.id, bankroll.name]));
  const history: HistoryBetItemData[] = scopedBets.map((bet) => ({
    id: bet.id,
    bankrollId: bet.bankrollId,
    bankrollName: bankrollName.get(bet.bankrollId) ?? "—",
    date: bet.date,
    sport: bet.sport,
    betType: bet.betType,
    description: bet.description,
    eventResult: bet.eventResult,
    stake: bet.stake,
    odds: bet.odds,
    result: bet.result,
    cashOutAmount: bet.cashOutAmount,
    boosted: bet.boosted,
    originalOdds: bet.originalOdds,
    freebet: bet.freebet,
    live: bet.live,
    profit: computeProfit(bet),
    format: bet.format,
    tipster: bet.tipster,
    selections: bet.selections,
  }));
  const current = tipster.costPeriods.find((period) => {
    const today = new Date().toISOString().slice(0, 10);
    const start = period.startDate.toISOString().slice(0, 10);
    const end = period.endDate?.toISOString().slice(0, 10);
    return start <= today && (!end || end >= today);
  }) ?? null;
  const money = (value: number) => fmtMoneySigned(value, locale, tipster.user.currency);

  return (
    <div className="flex flex-col gap-6">
      <header>
        <Link href="/tipsters" className="inline-flex min-h-touch items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground"><ArrowLeft size={15} aria-hidden />{t("back")}</Link>
        <div className="mt-2 flex flex-wrap items-center gap-2"><h1 className="text-xl font-semibold">{tipster.name}</h1>{tipster.status === "ARCHIVED" ? <span className="rounded-full bg-muted px-2 py-1 text-[0.65rem] font-semibold text-muted-foreground">{t("archived")}</span> : null}</div>
        <p className="mt-1 text-sm text-muted-foreground">{t("subtitle", { name: tipster.name })}</p>
      </header>

      <TipsterPeriodFilter from={fromValue} to={toValue} />

      {performance.settledBetCount === 0 ? <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">{t("noSettled")}</p> : null}

      <section aria-labelledby="primary-kpis">
        <h2 id="primary-kpis" className="mb-3 text-sm font-semibold">{t("results")}</h2>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <Metric label={t("bettingProfit")} value={money(performance.bettingProfit)} tone={performance.bettingProfit >= 0 ? "profit" : "loss"} />
          <Metric label={t("vipCost")} value={performance.serviceCost === null ? t("unknown") : performance.costState === "FREE" ? t("free") : `-${fmtMoney(performance.serviceCost, locale, tipster.user.currency)}`} />
          <Metric label={t("netProfit")} value={performance.netProfit === null ? "—" : money(performance.netProfit)} tone={performance.netProfit === null ? undefined : performance.netProfit >= 0 ? "profit" : "loss"} />
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
          <Metric label={t("bets")} value={String(performance.betCount)} />
          <Metric label={t("won")} value={String(performance.wins)} />
          <Metric label={t("lost")} value={String(performance.losses)} />
          <Metric label={t("winRate")} value={performance.winRate === null ? "—" : fmtPct(performance.winRate, locale, 1)} />
          <Metric label={t("totalStake")} value={fmtMoney(performance.totalStake, locale, tipster.user.currency)} />
          <Metric label={t("averageStake")} value={performance.averageStake === null ? "—" : fmtMoney(performance.averageStake, locale, tipster.user.currency)} />
          <Metric label={t("averageOdds")} value={performance.averageOdds === null ? "—" : performance.averageOdds.toFixed(2)} />
          <Metric label={t("roi")} value={performance.roi === null ? "—" : fmtPct(performance.roi, locale, 1)} />
        </div>
      </section>

      <section className="glass-card rounded-xl p-3 lg:p-4">
        <h2 className="text-sm font-semibold">{t("curve")}</h2>
        <ProfitCurve data={performance.cumulative} currency={tipster.user.currency} />
      </section>

      <section className="glass-card rounded-xl p-4">
        <h2 className="text-sm font-semibold">{t("vipTitle")}</h2>
        <p className="mb-4 mt-1 text-xs text-muted-foreground">{t("vipDescription")}</p>
        <TipsterCostEditor tipsterId={id} currency={tipster.user.currency} current={current ? {
          kind: current.kind,
          amount: current.amount,
          frequency: current.frequency,
          startDate: current.startDate.toISOString().slice(0, 10),
          endDate: current.endDate?.toISOString().slice(0, 10) ?? null,
        } : null} />
        <h3 className="mt-6 text-sm font-semibold">{t("historyTitle")}</h3>
        {tipster.costPeriods.length === 0 ? <p className="mt-2 text-xs text-muted-foreground">{t("historyEmpty")}</p> : (
          <ul className="mt-2 divide-y divide-border rounded-xl border border-border">
            {tipster.costPeriods.map((period) => <li key={period.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-3 text-xs"><span>{period.startDate.toISOString().slice(0, 10)} → {period.endDate ? period.endDate.toISOString().slice(0, 10) : t("ongoing")}</span><strong>{period.kind === "FREE" ? t("free") : `${fmtMoney(period.amount ?? 0, locale, period.currency)}${period.frequency ? ` · ${t(`frequencies.${period.frequency}`)}` : ""}`}</strong></li>)}
          </ul>
        )}
      </section>

      <section className="glass-card overflow-hidden rounded-xl p-4">
        <h2 className="text-sm font-semibold">{t("monthlyTitle")}</h2>
        {performance.monthly.length === 0 ? <p className="py-6 text-center text-sm text-muted-foreground">{t("monthlyEmpty")}</p> : <div className="no-scrollbar -mx-4 mt-3 overflow-x-auto px-4"><table className="w-full min-w-[620px] text-xs"><thead><tr className="border-b border-border text-left uppercase tracking-wide text-muted-foreground"><th className="py-2">{t("month")}</th><th className="py-2 text-right">{t("bets")}</th><th className="py-2 text-right">{t("bettingProfit")}</th><th className="py-2 text-right">{t("vipCost")}</th><th className="py-2 text-right">{t("netProfit")}</th></tr></thead><tbody>{performance.monthly.map((row) => <tr key={row.month} className="border-b border-border/50"><td className="py-2">{new Intl.DateTimeFormat(locale, { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${row.month}-01`))}</td><td className="num py-2 text-right">{row.bets}</td><td className="num py-2 text-right">{money(row.bettingProfit)}</td><td className="num py-2 text-right">{row.serviceCost === null ? "—" : `-${fmtMoney(row.serviceCost, locale, tipster.user.currency)}`}</td><td className="num py-2 text-right font-semibold">{row.netProfit === null ? "—" : money(row.netProfit)}</td></tr>)}</tbody></table></div>}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold">{t("betsTitle")}</h2>
        <HistoryList bets={history} bankrollOptions={activeBankrolls.map(({ id: bankrollId, name }) => ({ id: bankrollId, name }))} currency={tipster.user.currency} taxonomy={taxonomy} tipsters={tipsters.map(({ id: tipsterId, name, normalizedName, status }) => ({ id: tipsterId, name, normalizedName, status }))} />
      </section>
    </div>
  );
}
