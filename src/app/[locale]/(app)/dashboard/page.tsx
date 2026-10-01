import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { listBankrolls } from "@/lib/actions/bankrolls";
import { listAllBets } from "@/lib/actions/bets";
import { listAllBankrollMovements } from "@/lib/actions/bankroll-movements";
import { computeProfit, countsTowardPerformance, realStake } from "@/lib/profit";
import { unitPerformance } from "@/lib/unit-performance";
import { movementDelta } from "@/lib/bankroll-balance";
import { getServerCurrency } from "@/lib/get-server-currency";
import { summarizeBankrolls } from "@/lib/summaries";
import { computeGlobalStats } from "@/lib/stats";
import { getMonthlyQuotaStatus } from "@/lib/scan/monthly-quota";
import { QuotaCard } from "@/components/dashboard/quota-card";
import { KpiRow } from "@/components/dashboard/kpi-row";
import { GoalsCard } from "@/components/dashboard/goals-card";
import { BankrollCards } from "@/components/dashboard/bankroll-cards";
import { RecentBets } from "@/components/dashboard/recent-bets";
import { PerformancePanel } from "@/components/dashboard/performance-panel";
import { OnboardingCard } from "@/components/dashboard/onboarding-card";
import { CapitalFlowCard } from "@/components/dashboard/capital-flow-card";
import { DiscordCommunityCard } from "@/components/dashboard/discord-community-card";
import { PersonalConversionCard } from "@/components/dashboard/personal-conversion-card";
import { getTranslations } from "next-intl/server";
import { cn } from "@/lib/utils";
import { Link } from "@/i18n/navigation";
import { Sparkle } from "@phosphor-icons/react/dist/ssr";

// Sections en cascade : chaque bloc apparaît avec un léger décalage
function Reveal({
  index,
  children,
  className,
}: {
  index: number;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn("min-w-0 animate-fade-in-up", className)}
      style={{ animationDelay: `${index * 70}ms` }}
    >
      {children}
    </div>
  );
}

export default async function DashboardPage() {
  const user = await requireUser();
  let bankrolls;
  let bets;
  let dbUser;
  let betaProgram;
  let movements;
  try {
    // La base de production passe par le pooler Supabase avec une connexion
    // Prisma par instance serverless. Ces lectures indépendantes étaient
    // auparavant lancées en parallèle : sous charge, leur file d'attente
    // pouvait dépasser le pool_timeout et empêcher l'affichage du Dashboard.
    // Les garder séquentielles privilégie ici la disponibilité du parcours
    // bêta à quelques millisecondes de parallélisme théorique.
    bankrolls = await listBankrolls();
    bets = await listAllBets();
    dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: { personalConversion: true },
    });
    betaProgram = await prisma.betaProgram.findUnique({
      where: { id: "global" },
      select: { phase: true },
    });
    movements = await listAllBankrollMovements();
  } catch (error) {
    const databaseUrl = process.env.DATABASE_URL;
    const databaseHost = databaseUrl
      ? (() => {
          try {
            const url = new URL(databaseUrl);
            return `${url.hostname}:${url.port || "5432"}`;
          } catch {
            return "invalid";
          }
        })()
      : "missing";
    console.error("[dashboard] database load failed", {
      name: error instanceof Error ? error.name : "UnknownError",
      message: error instanceof Error ? error.message : String(error),
      databaseHost,
    });
    throw error;
  }
  const plan = dbUser?.plan ?? "FREE";
  const [currency, t] = await Promise.all([
    getServerCurrency(),
    getTranslations("dashboard"),
  ]);
  const quota = await getMonthlyQuotaStatus(user.id, plan);

  // Après le passage au Freemium, les bankrolls verrouillées ne doivent plus
  // alimenter les soldes, statistiques ni paris affichés sur le Dashboard.
  const activeBankrollIds = new Set(bankrolls.filter((bankroll) => !bankroll.locked).map((bankroll) => bankroll.id));
  bankrolls = bankrolls.filter((bankroll) => activeBankrollIds.has(bankroll.id));
  bets = bets.filter((bet) => activeBankrollIds.has(bet.bankrollId));
  movements = movements.filter((movement) => activeBankrollIds.has(movement.bankrollId));

  // Même sémantique que le Dashboard de l'artifact : seuls les paris
  // réglés comptent dans le solde et les stats.
  const settled = bets
    .filter((b) => countsTowardPerformance(b.result))
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  const totalInitial = bankrolls.reduce((s, br) => s + br.initial, 0);
  const totalDeposits = movements.filter((movement) => movement.type === "DEPOSIT").reduce((sum, movement) => sum + movement.amount, 0);
  const totalWithdrawals = movements.filter((movement) => movement.type === "WITHDRAWAL").reduce((sum, movement) => sum + movement.amount, 0);
  const totalNetFunding = totalInitial + totalDeposits - totalWithdrawals;
  const totalProfit = settled.reduce((s, b) => s + computeProfit(b), 0);
  const totalBalance = totalNetFunding + totalProfit;
  const totalStaked = settled.reduce((s, b) => s + realStake(b), 0);
  const units = unitPerformance(bets);
  const roi = totalStaked > 0 ? (totalProfit / totalStaked) * 100 : 0;
  const wonCount = settled.filter((b) => b.result === "GAGNE").length;
  const winRate = settled.length > 0 ? (wonCount / settled.length) * 100 : 0;
  const now = new Date();
  const monthProfit = settled
    .filter(
      (b) =>
        b.date.getFullYear() === now.getFullYear() &&
        b.date.getMonth() === now.getMonth()
    )
    .reduce((s, b) => s + computeProfit(b), 0);
  const hasMonthlyGuardrail = (dbUser?.monthlyProfitGoal ?? 0) > 0 || (dbUser?.monthlyLossLimit ?? 0) > 0;

  // Courbe globale du capital : tous les paris réglés de l'utilisateur, toutes
  // bankrolls confondues. Les filtres de période sont appliqués côté interface.
  const performanceEvents = [
    ...settled.map((bet) => ({ date: bet.date, delta: computeProfit(bet) })),
    ...movements.map((movement) => ({ date: movement.date, delta: movementDelta(movement) })),
  ].sort((a, b) => a.date.getTime() - b.date.getTime());
  const performancePoints = performanceEvents.reduce<Array<{ date: string; balance: number }>>(
    (points, event) => {
      points.push({
        date: event.date.toISOString().slice(0, 10),
        balance: (points.at(-1)?.balance ?? totalInitial) + event.delta,
      });
      return points;
    },
    []
  );

  const bankrollSummaries = summarizeBankrolls(bankrolls, bets, movements);
  const dashboardBankrolls = bankrollSummaries.map((summary) => {
    const bankrollBets = bets.filter((bet) => bet.bankrollId === summary.id);
    const performance = unitPerformance(bankrollBets);
    return {
      ...summary,
      betCount: bankrollBets.length,
      unitProfit: performance.profit,
      missingUnits: performance.missing,
      roi: computeGlobalStats(bankrollBets).roi,
    };
  });

  const bankrollName = (id: string) =>
    bankrolls.find((br) => br.id === id)?.name ?? "—";
  const recentBets = bets.slice(0, 5).map((b) => ({
    id: b.id,
    date: b.date,
    sport: b.sport,
    betType: b.betType,
    stake: b.stake,
    stakeUnits: b.stakeUnits,
    pending: b.result === "EN_ATTENTE",
    profit: computeProfit(b),
    unitProfit: unitPerformance([b]).profit,
    bankrollName: bankrollName(b.bankrollId),
  }));

  if (bankrolls.length === 0) {
    return (
      <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col justify-center py-8 animate-fade-in-up">
        <OnboardingCard hasBankroll={false} hasBet={false} />
      </div>
    );
  }

  return (
    <div className="grid min-w-0 grid-cols-1 gap-5 xl:grid-cols-12 xl:items-start xl:gap-6">
      <header className="xl:col-span-12">
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("workspaceSubtitle")}</p>
      </header>
      {bets.length === 0 && (
        <Reveal index={0} className="xl:col-span-12">
          <OnboardingCard hasBankroll hasBet={false} />
        </Reveal>
      )}

      <Reveal index={0} className="xl:col-span-8">
        <PerformancePanel
          points={performancePoints}
          balance={totalBalance}
          currency={currency}
        />
      </Reveal>

      <Reveal index={1} className="xl:col-span-4">
        <KpiRow
          profit={totalProfit}
          unitProfit={units.profit}
          missingUnitCount={units.missing}
          totalCount={bets.length}
          pendingCount={bets.filter((bet) => bet.result === "EN_ATTENTE").length}
          roi={roi}
          winRate={winRate}
          settledCount={settled.length}
          wonCount={wonCount}
          currency={currency}
        />
      </Reveal>

      <Reveal index={2} className="xl:col-span-12">
        <BankrollCards bankrolls={dashboardBankrolls} currency={currency} />
      </Reveal>

      <Reveal index={3} className="xl:col-span-12">
        <Link href="/ai-insights" className="flex min-h-20 items-center gap-3 rounded-2xl border border-primary/30 bg-primary/10 p-4 transition-colors hover:bg-primary/15">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground"><Sparkle size={20} weight="fill" aria-hidden /></span>
          <span className="min-w-0 flex-1"><strong className="block text-sm font-semibold">{t("aiTeaserTitle")}</strong><span className="mt-0.5 block text-xs text-muted-foreground">{t("aiTeaserDescription")}</span></span>
          <span className="hidden text-xs font-semibold text-primary sm:inline">{t("aiTeaserCta")}</span>
        </Link>
      </Reveal>

      <Reveal index={4} className="xl:col-span-12">
        <RecentBets bets={recentBets} currency={currency} />
      </Reveal>

      <Reveal index={5} className="xl:col-span-12">
        <details className="group glass-card rounded-2xl p-4 sm:p-5">
          <summary className="min-h-touch cursor-pointer list-none text-sm font-semibold text-primary marker:content-none">
            {t("moreTitle")} <span className="ml-2 font-normal text-muted-foreground">{t("moreDescription")}</span>
          </summary>
          <div className="mt-4 grid min-w-0 gap-4 border-t border-border pt-4 lg:grid-cols-2">
            <CapitalFlowCard initial={totalInitial} deposits={totalDeposits} withdrawals={totalWithdrawals} netFunding={totalNetFunding} profit={totalProfit} currency={currency} />
            {hasMonthlyGuardrail ? <GoalsCard monthProfit={monthProfit} profitGoal={dbUser?.monthlyProfitGoal ?? 0} lossLimit={dbUser?.monthlyLossLimit ?? 0} /> : null}
          </div>
          <aside aria-label={t("resources")} className="mt-4 grid min-w-0 gap-3 border-t border-border pt-4 md:grid-cols-2 xl:grid-cols-3">
            <QuotaCard plan={plan} scansUsed={quota.used} scansLimit={quota.limit} initialCreditsRemaining={quota.initialCreditsRemaining} initialCreditsExpiresAt={quota.initialCreditsExpiresAt} referralCreditsRemaining={quota.referralCreditsRemaining} betaPhaseActive={betaProgram?.phase !== "ENDED"} />
            <PersonalConversionCard conversion={dbUser?.personalConversion ?? null} currency={currency} />
            {bets.length > 0 ? <DiscordCommunityCard /> : null}
          </aside>
        </details>
      </Reveal>
    </div>
  );
}
