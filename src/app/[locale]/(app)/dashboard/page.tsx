import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { listBankrolls } from "@/lib/actions/bankrolls";
import { listAllBets } from "@/lib/actions/bets";
import { listAllBankrollMovements } from "@/lib/actions/bankroll-movements";
import { computeProfit, realStake } from "@/lib/profit";
import { movementDelta } from "@/lib/bankroll-balance";
import { getServerCurrency } from "@/lib/get-server-currency";
import { summarizeBankrolls } from "@/lib/summaries";
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

// Sections en cascade : chaque bloc apparaît avec un léger décalage
function Reveal({
  index,
  children,
}: {
  index: number;
  children: React.ReactNode;
}) {
  return (
    <div
      className="animate-fade-in-up"
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
    [bankrolls, bets, dbUser, betaProgram, movements] = await Promise.all([
      listBankrolls(),
      listAllBets(),
      prisma.user.findUnique({ where: { id: user.id } }),
      prisma.betaProgram.findUnique({ where: { id: "global" }, select: { phase: true } }),
      listAllBankrollMovements(),
    ]);
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
  const currency = await getServerCurrency();
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
    .filter((b) => b.result !== "EN_ATTENTE")
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  const totalInitial = bankrolls.reduce((s, br) => s + br.initial, 0);
  const totalDeposits = movements.filter((movement) => movement.type === "DEPOSIT").reduce((sum, movement) => sum + movement.amount, 0);
  const totalWithdrawals = movements.filter((movement) => movement.type === "WITHDRAWAL").reduce((sum, movement) => sum + movement.amount, 0);
  const totalNetFunding = totalInitial + totalDeposits - totalWithdrawals;
  const totalProfit = settled.reduce((s, b) => s + computeProfit(b), 0);
  const totalBalance = totalNetFunding + totalProfit;
  const totalStaked = settled.reduce((s, b) => s + realStake(b), 0);
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

  const bankrollName = (id: string) =>
    bankrolls.find((br) => br.id === id)?.name ?? "—";
  const recentBets = bets.slice(0, 5).map((b) => ({
    id: b.id,
    date: b.date,
    sport: b.sport,
    betType: b.betType,
    stake: b.stake,
    pending: b.result === "EN_ATTENTE",
    profit: computeProfit(b),
    bankrollName: bankrollName(b.bankrollId),
  }));

  if (bankrolls.length === 0) {
    return (
      <div className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center py-8 animate-fade-in-up">
        <OnboardingCard hasBankroll={false} hasBet={false} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {bets.length === 0 && (
        <Reveal index={0}>
          <OnboardingCard hasBankroll hasBet={false} />
        </Reveal>
      )}

      <Reveal index={bets.length === 0 ? 1 : 0}>
        <PerformancePanel
          points={performancePoints}
          balance={totalBalance}
          currency={currency}
        />
      </Reveal>

      {bets.length > 0 && (
        <Reveal index={1}>
          <DiscordCommunityCard />
        </Reveal>
      )}

      <Reveal index={2}>
        <CapitalFlowCard
          deposits={totalDeposits}
          withdrawals={totalWithdrawals}
          netFunding={totalNetFunding}
          profit={totalProfit}
          currency={currency}
        />
      </Reveal>

      <Reveal index={3}>
        <KpiRow
          profit={totalProfit}
          roi={roi}
          winRate={winRate}
          settledCount={settled.length}
          wonCount={wonCount}
        />
      </Reveal>

      <Reveal index={4}>
        <GoalsCard
          monthProfit={monthProfit}
          profitGoal={dbUser?.monthlyProfitGoal ?? 0}
          lossLimit={dbUser?.monthlyLossLimit ?? 0}
        />
      </Reveal>

      <Reveal index={5}>
        <QuotaCard
          plan={plan}
          scansUsed={quota.used}
          scansLimit={quota.limit}
          initialCreditsRemaining={quota.initialCreditsRemaining}
          initialCreditsExpiresAt={quota.initialCreditsExpiresAt}
          betaPhaseActive={betaProgram?.phase !== "ENDED"}
        />
      </Reveal>

      <Reveal index={6}>
        <BankrollCards bankrolls={bankrollSummaries} />
      </Reveal>

      <Reveal index={7}>
        <RecentBets bets={recentBets} />
      </Reveal>
    </div>
  );
}
