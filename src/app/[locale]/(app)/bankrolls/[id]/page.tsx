import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { listBankrolls, deleteBankroll } from "@/lib/actions/bankrolls";
import { listBets } from "@/lib/actions/bets";
import { computeProfit } from "@/lib/profit";
import { getServerCurrency } from "@/lib/get-server-currency";
import { BankrollDetailHeader } from "@/components/bankrolls/bankroll-detail-header";
import { BankrollDetailActions } from "@/components/bankrolls/bankroll-detail-actions";
import { Sparkline } from "@/components/dashboard/sparkline";
import { HistoryList, type HistoryBetItemData } from "@/components/history/history-list";

export default async function BankrollDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Scopé à l'utilisateur connecté : une bankroll d'un autre compte = 404.
  const bankrolls = await listBankrolls();
  const bankroll = bankrolls.find((b) => b.id === id);
  if (!bankroll) notFound();

  const bets = await listBets(id);

  // Même sémantique que le Dashboard : seuls les paris réglés comptent dans
  // le solde ; la courbe part du capital initial puis cumule pari par pari.
  const settled = bets
    .filter((b) => b.result !== "EN_ATTENTE")
    .sort((a, b) => a.date.getTime() - b.date.getTime());
  const profit = settled.reduce((s, b) => s + computeProfit(b), 0);
  const balance = bankroll.initial + profit;

  let running = bankroll.initial;
  const curve = [bankroll.initial, ...settled.map((b) => (running += computeProfit(b)))];

  const items: HistoryBetItemData[] = bets.map((b) => ({
    id: b.id,
    bankrollId: b.bankrollId,
    bankrollName: bankroll.name,
    date: b.date,
    sport: b.sport,
    betType: b.betType,
    description: b.description,
    stake: b.stake,
    odds: b.odds,
    result: b.result,
    cashOutAmount: b.cashOutAmount,
    boosted: b.boosted,
    originalOdds: b.originalOdds,
    freebet: b.freebet,
    live: b.live,
    profit: computeProfit(b),
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
