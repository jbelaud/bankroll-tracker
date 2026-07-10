import { getTranslations } from "next-intl/server";
import { listAllBets } from "@/lib/actions/bets";
import { listBankrolls } from "@/lib/actions/bankrolls";
import { computeProfit } from "@/lib/profit";
import { getServerCurrency } from "@/lib/get-server-currency";
import { HistoryList, type HistoryBetItemData } from "@/components/history/history-list";

export default async function HistoryPage() {
  const [bets, bankrolls] = await Promise.all([listAllBets(), listBankrolls()]);

  const bankrollName = (id: string) => bankrolls.find((br) => br.id === id)?.name ?? "—";

  const items: HistoryBetItemData[] = bets.map((b) => ({
    id: b.id,
    bankrollId: b.bankrollId,
    bankrollName: bankrollName(b.bankrollId),
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

  const bankrollOptions = bankrolls.map((br) => ({ id: br.id, name: br.name }));
  const t = await getTranslations("history");
  const currency = await getServerCurrency();

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">{t("title")}</h1>
      <HistoryList bets={items} bankrollOptions={bankrollOptions} currency={currency} />
    </div>
  );
}
