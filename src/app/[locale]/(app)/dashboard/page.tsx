import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Wallet } from "@phosphor-icons/react/dist/ssr";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { listBankrolls } from "@/lib/actions/bankrolls";
import { listAllBets } from "@/lib/actions/bets";
import { computeProfit, realStake } from "@/lib/profit";
import { summarizeBankrolls } from "@/lib/summaries";
import { HeroBalance } from "@/components/dashboard/hero-balance";
import { KpiRow } from "@/components/dashboard/kpi-row";
import { Sparkline } from "@/components/dashboard/sparkline";
import { GoalsCard } from "@/components/dashboard/goals-card";
import { BankrollCards } from "@/components/dashboard/bankroll-cards";
import { RecentBets } from "@/components/dashboard/recent-bets";

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
  const [bankrolls, bets, dbUser] = await Promise.all([
    listBankrolls(),
    listAllBets(),
    prisma.user.findUnique({ where: { id: user.id } }),
  ]);

  // Même sémantique que le Dashboard de l'artifact : seuls les paris
  // réglés comptent dans le solde et les stats.
  const settled = bets
    .filter((b) => b.result !== "EN_ATTENTE")
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  const totalInitial = bankrolls.reduce((s, br) => s + br.initial, 0);
  const totalProfit = settled.reduce((s, b) => s + computeProfit(b), 0);
  const totalBalance = totalInitial + totalProfit;
  const totalStaked = settled.reduce((s, b) => s + realStake(b), 0);
  const roi = totalStaked > 0 ? (totalProfit / totalStaked) * 100 : 0;
  const wonCount = settled.filter((b) => b.result === "GAGNE").length;
  const winRate = settled.length > 0 ? (wonCount / settled.length) * 100 : 0;
  const pendingCount = bets.length - settled.length;

  const now = new Date();
  const monthProfit = settled
    .filter(
      (b) =>
        b.date.getFullYear() === now.getFullYear() &&
        b.date.getMonth() === now.getMonth()
    )
    .reduce((s, b) => s + computeProfit(b), 0);

  // Courbe du solde : capital initial puis cumul pari par pari
  let running = totalInitial;
  const curve = [totalInitial, ...settled.map((b) => (running += computeProfit(b)))];

  const bankrollSummaries = summarizeBankrolls(bankrolls, bets);

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
    const t = await getTranslations("dashboard");
    const tCommon = await getTranslations("common");
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 py-24 text-center animate-fade-in-up">
        <div className="glass-card flex size-16 items-center justify-center rounded-2xl">
          <Wallet size={30} className="text-primary" aria-hidden />
        </div>
        <div className="flex flex-col gap-1">
          <h1 className="text-lg font-semibold">{t("welcomeTitle")}</h1>
          <p className="max-w-60 text-sm text-muted-foreground">
            {t("welcomeSubtitle")}
          </p>
        </div>
        <Link
          href="/bankrolls"
          className="flex min-h-touch items-center rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground transition-transform active:scale-95"
        >
          {tCommon("createBankrollCta")}
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Reveal index={0}>
        <HeroBalance
          balance={totalBalance}
          totalProfit={totalProfit}
          pendingCount={pendingCount}
        />
      </Reveal>

      <Reveal index={1}>
        <KpiRow
          profit={totalProfit}
          roi={roi}
          winRate={winRate}
          settledCount={settled.length}
          wonCount={wonCount}
        />
      </Reveal>

      {curve.length >= 2 && (
        <Reveal index={2}>
          <div className="glass-card rounded-xl p-4">
            <Sparkline points={curve} />
          </div>
        </Reveal>
      )}

      <Reveal index={3}>
        <GoalsCard
          monthProfit={monthProfit}
          profitGoal={dbUser?.monthlyProfitGoal ?? 0}
          lossLimit={dbUser?.monthlyLossLimit ?? 0}
        />
      </Reveal>

      <Reveal index={4}>
        <BankrollCards bankrolls={bankrollSummaries} />
      </Reveal>

      <Reveal index={5}>
        <RecentBets bets={recentBets} />
      </Reveal>
    </div>
  );
}
