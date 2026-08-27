import { getTranslations } from "next-intl/server";
import { listAllBets } from "@/lib/actions/bets";
import { listBankrolls } from "@/lib/actions/bankrolls";
import { computeProfit } from "@/lib/profit";
import { getServerCurrency } from "@/lib/get-server-currency";
import { HistoryList, type HistoryBetItemData } from "@/components/history/history-list";
import { requireUser } from "@/lib/auth";
import { getUserTaxonomy } from "@/lib/taxonomy";

export default async function HistoryPage() {
  const user = await requireUser();
  const [bets, bankrolls, taxonomy] = await Promise.all([listAllBets(), listBankrolls(), getUserTaxonomy(user.id)]);
  const activeBankrolls = bankrolls.filter((bankroll) => !bankroll.locked);
  const activeBankrollIds = new Set(activeBankrolls.map((bankroll) => bankroll.id));
  const activeBets = bets.filter((bet) => activeBankrollIds.has(bet.bankrollId));

  const bankrollName = (id: string) => activeBankrolls.find((br) => br.id === id)?.name ?? "—";

  const items: HistoryBetItemData[] = activeBets.map((b) => ({
    id: b.id,
    bankrollId: b.bankrollId,
    bankrollName: bankrollName(b.bankrollId),
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
    profit: computeProfit(b),
    format: b.format,
    tipster: b.tipster,
    selections: b.selections,
  }));

  const bankrollOptions = activeBankrolls.map((br) => ({ id: br.id, name: br.name }));
  const t = await getTranslations("history");
  const currency = await getServerCurrency();

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">{t("title")}</h1>
      <HistoryList bets={items} bankrollOptions={bankrollOptions} currency={currency} taxonomy={taxonomy} />
    </div>
  );
}
