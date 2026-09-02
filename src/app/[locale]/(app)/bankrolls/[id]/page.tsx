import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { listBankrolls, deleteBankroll } from "@/lib/actions/bankrolls";
import { listBets } from "@/lib/actions/bets";
import { listBankrollMovements } from "@/lib/actions/bankroll-movements";
import { movementDelta, summarizeBankrollCapital } from "@/lib/bankroll-balance";
import { computeProfit, countsTowardPerformance } from "@/lib/profit";
import { getServerCurrency } from "@/lib/get-server-currency";
import { BankrollDetailHeader } from "@/components/bankrolls/bankroll-detail-header";
import { BankrollDetailActions } from "@/components/bankrolls/bankroll-detail-actions";
import { Sparkline } from "@/components/dashboard/sparkline";
import { HistoryList, type HistoryBetItemData } from "@/components/history/history-list";
import { BankrollCapitalStats } from "@/components/bankrolls/bankroll-capital-stats";
import { BankrollMovementPanel } from "@/components/bankrolls/bankroll-movement-panel";
import { BankrollAllocationList } from "@/components/bankrolls/bankroll-allocation-list";
import { Link } from "@/i18n/navigation";
import { LockKey } from "@phosphor-icons/react/dist/ssr";
import { requireUser } from "@/lib/auth";
import { getUserTaxonomy } from "@/lib/taxonomy";
import { listTipsters } from "@/lib/actions/tipsters";

export default async function BankrollDetailPage({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const { id, locale } = await params;
  const user = await requireUser();

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

  // Le pool PostgreSQL de production ne dispose que d'une connexion. Ces
  // actions font chacune des vérifications d'accès avant leur requête : les
  // exécuter en parallèle peut donc épuiser le pool pendant un rafraîchissement
  // après déplacement d'un pari (P2024). Les séquencer garde le rendu fiable.
  const bets = await listBets(id);
  const movements = await listBankrollMovements(id);
  const taxonomy = await getUserTaxonomy(user.id);
  const tipsters = await listTipsters();

  // Même sémantique que le Dashboard : seuls les paris réglés comptent dans
  // le solde ; la courbe part du capital initial puis cumule pari par pari.
  const settled = bets
    .filter((b) => countsTowardPerformance(b.result))
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
    referenceCapital: bankroll.referenceCapital,
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
    format: b.format,
    tipster: b.tipster,
    selections: b.selections,
  }));

  const deleteThisBankroll = deleteBankroll.bind(null, bankroll.id);
  const t = await getTranslations("bankrollDetail");
  const currency = await getServerCurrency();
  const allocationItems = bankroll.allocations.map((allocation) => ({
    id: allocation.id,
    bookmaker: allocation.bookmaker,
    balance: allocation.initial
      + bets.filter((bet) => bet.allocationId === allocation.id && countsTowardPerformance(bet.result)).reduce((sum, bet) => sum + profitOfBet(bet), 0)
      + movements.filter((movement) => movement.allocationId === allocation.id).reduce((sum, movement) => sum + movementDelta(movement), 0),
    betCount: bets.filter((bet) => bet.allocationId === allocation.id).length,
  }));

  return (
    <div className="flex flex-col gap-4 lg:grid lg:grid-cols-12 lg:items-start lg:gap-6">
      <div className="lg:col-span-12">
        <BankrollDetailHeader
          name={bankroll.name}
          mode={bankroll.mode}
          allocationCount={bankroll.allocations.length}
          referenceCapital={bankroll.referenceCapital}
          balance={balance}
          profit={profit}
          initial={bankroll.initial}
          betCount={bets.length}
          pendingCount={bets.filter((bet) => bet.result === "EN_ATTENTE").length}
          currency={currency}
        />
      </div>

      {bankroll.mode === "DISTRIBUTED" ? <BankrollAllocationList allocations={allocationItems} unassignedBetCount={bets.filter((bet) => !bet.allocationId).length} currency={currency} /> : null}

      <div className="lg:col-span-5">
        <BankrollCapitalStats
          deposits={capital.deposits}
          withdrawals={capital.withdrawals}
          netFunding={capital.netFunding}
          profit={capital.profit}
          performancePct={capital.performancePct}
          currency={currency}
        />
      </div>

      <div className="lg:col-span-3">
        <BankrollDetailActions
          bankroll={{
            id: bankroll.id,
            name: bankroll.name,
            mode: bankroll.mode,
            bookmaker: bankroll.bookmaker,
            initial: bankroll.initial,
            referenceCapital: bankroll.referenceCapital,
            allocations: bankroll.allocations,
          }}
          betCount={bets.length}
          deleteAction={deleteThisBankroll}
          currency={currency}
        />
      </div>

      <div className="lg:col-span-4">
        <BankrollMovementPanel
          bankrollId={bankroll.id}
          movements={movements.map((movement) => ({ id: movement.id, type: movement.type, amount: movement.amount, note: movement.note, date: movement.date.toISOString() }))}
          currency={currency}
          locale={locale}
          today={new Date().toISOString().slice(0, 10)}
          allocations={bankroll.mode === "DISTRIBUTED" ? bankroll.allocations.map(({ id: allocationId, bookmaker }) => ({ id: allocationId, bookmaker })) : []}
        />
      </div>

      {curve.length >= 2 && (
        <div className="glass-card rounded-xl p-4 lg:col-span-12">
          <Sparkline points={curve} />
        </div>
      )}

      <section className="flex flex-col gap-2 lg:col-span-12">
        <h2 className="text-sm font-semibold">{t("historyTitle")}</h2>
      <HistoryList
        bets={items}
        bankrollOptions={bankrolls.filter((item) => !item.locked).map((item) => ({ id: item.id, name: item.name }))}
        scopedToBankroll
        currency={currency}
        taxonomy={taxonomy}
        tipsters={tipsters.map(({ id: tipsterId, name, normalizedName, status }) => ({ id: tipsterId, name, normalizedName, status }))}
      />
      </section>
    </div>
  );
}

function profitOfBet(bet: Parameters<typeof computeProfit>[0]) {
  return computeProfit(bet);
}
