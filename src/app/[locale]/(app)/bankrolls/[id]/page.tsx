import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { listBankrolls, deleteBankroll } from "@/lib/actions/bankrolls";
import { listBets } from "@/lib/actions/bets";
import { listBankrollMovements } from "@/lib/actions/bankroll-movements";
import { movementDelta, summarizeBankrollCapital } from "@/lib/bankroll-balance";
import { computeProfit } from "@/lib/profit";
import { getServerCurrency } from "@/lib/get-server-currency";
import { BankrollDetailHeader } from "@/components/bankrolls/bankroll-detail-header";
import { BankrollDetailActions } from "@/components/bankrolls/bankroll-detail-actions";
import { Sparkline } from "@/components/dashboard/sparkline";
import { HistoryList, type HistoryBetItemData } from "@/components/history/history-list";
import { BankrollCapitalStats } from "@/components/bankrolls/bankroll-capital-stats";
import { BankrollMovementPanel } from "@/components/bankrolls/bankroll-movement-panel";
import { Link } from "@/i18n/navigation";
import { LockKey } from "@phosphor-icons/react/dist/ssr";

export default async function BankrollDetailPage({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const { id, locale } = await params;

  // Scopé à l'utilisateur connecté : une bankroll d'un autre compte = 404.
  const bankrolls = await listBankrolls();
  const bankroll = bankrolls.find((b) => b.id === id);
  if (!bankroll) notFound();

  if (bankroll.locked) {
    const t = await getTranslations("bankrolls.locked");
    return (
      <div className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center py-8 animate-fade-in-up">
        <section className="glass-card flex flex-col items-center gap-4 rounded-2xl p-6 text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <LockKey size={22} weight="fill" aria-hidden />
          </span>
          <div>
            <h1 className="text-lg font-semibold">{t("title")}</h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t("description")}</p>
          </div>
          <Link href="/account" className="flex min-h-touch items-center rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground transition-transform active:scale-95">
            {t("cta")}
          </Link>
        </section>
      </div>
    );
  }

  const [bets, movements] = await Promise.all([listBets(id), listBankrollMovements(id)]);

  // Même sémantique que le Dashboard : seuls les paris réglés comptent dans
  // le solde ; la courbe part du capital initial puis cumule pari par pari.
  const settled = bets
    .filter((b) => b.result !== "EN_ATTENTE")
    .sort((a, b) => a.date.getTime() - b.date.getTime());
  const capital = summarizeBankrollCapital(bankroll, bets, movements);
  const { profit, balance } = capital;

  const curveEvents = [
    ...settled.map((bet) => ({ date: bet.date, delta: profitOfBet(bet) })),
    ...movements.map((movement) => ({ date: movement.date, delta: movementDelta(movement) })),
  ].sort((a, b) => a.date.getTime() - b.date.getTime());
  const curve = curveEvents.reduce<number[]>((points, event) => [...points, (points.at(-1) ?? bankroll.initial) + event.delta], [bankroll.initial]);

  const items: HistoryBetItemData[] = bets.map((b) => ({
    id: b.id,
    bankrollId: b.bankrollId,
    bankrollName: bankroll.name,
    date: b.date,
    sport: b.sport,
    betType: b.betType,
    description: b.description,
    eventResult: b.eventResult,
    stake: b.stake,
    odds: b.odds,
    result: b.result,
    cashOutAmount: b.cashOutAmount,
    boosted: b.boosted,
    originalOdds: b.originalOdds,
    freebet: b.freebet,
    live: b.live,
    profit: profitOfBet(b),
  }));

  const deleteThisBankroll = deleteBankroll.bind(null, bankroll.id);
  const t = await getTranslations("bankrollDetail");
  const currency = await getServerCurrency();

  return (
    <div className="flex flex-col gap-4">
      <BankrollDetailHeader
        name={bankroll.name}
        bookmaker={bankroll.bookmaker}
        balance={balance}
        profit={profit}
        initial={bankroll.initial}
        betCount={bets.length}
        pendingCount={bets.filter((bet) => bet.result === "EN_ATTENTE").length}
        currency={currency}
      />

      <BankrollCapitalStats
        deposits={capital.deposits}
        withdrawals={capital.withdrawals}
        netFunding={capital.netFunding}
        profit={capital.profit}
        performancePct={capital.performancePct}
        currency={currency}
      />

      <BankrollDetailActions
        bankroll={{
          id: bankroll.id,
          name: bankroll.name,
          bookmaker: bankroll.bookmaker,
          initial: bankroll.initial,
        }}
        betCount={bets.length}
        deleteAction={deleteThisBankroll}
        currency={currency}
      />

      <BankrollMovementPanel
        bankrollId={bankroll.id}
        movements={movements.map((movement) => ({ id: movement.id, type: movement.type, amount: movement.amount, note: movement.note, date: movement.date.toISOString() }))}
        currency={currency}
        locale={locale}
        today={new Date().toISOString().slice(0, 10)}
      />

      {curve.length >= 2 && (
        <div className="glass-card rounded-xl p-4">
          <Sparkline points={curve} />
        </div>
      )}

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold">{t("historyTitle")}</h2>
        <HistoryList bets={items} scopedToBankroll currency={currency} />
      </section>
    </div>
  );
}

function profitOfBet(bet: Parameters<typeof computeProfit>[0]) {
  return computeProfit(bet);
}
