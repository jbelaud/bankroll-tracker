import { getTranslations } from "next-intl/server";
import { listBankrolls } from "@/lib/actions/bankrolls";
import { listAllBets } from "@/lib/actions/bets";
import { listAllBankrollMovements } from "@/lib/actions/bankroll-movements";
import { summarizeBankrolls } from "@/lib/summaries";
import { getServerCurrency } from "@/lib/get-server-currency";
import {
  BankrollList,
  type BankrollListItem,
} from "@/components/bankrolls/bankroll-list";

export default async function BankrollsPage({
  searchParams,
}: {
  searchParams: Promise<{ create?: string | string[] }>;
}) {
  const { create } = await searchParams;
  const [bankrolls, bets, movements] = await Promise.all([listBankrolls(), listAllBets(), listAllBankrollMovements()]);
  const summaries = summarizeBankrolls(bankrolls, bets, movements);

  const items: BankrollListItem[] = bankrolls.map((br) => {
    const summary = summaries.find((s) => s.id === br.id)!;
    return {
      id: br.id,
      name: br.name,
      bookmaker: br.bookmaker,
      initial: br.initial,
      balance: summary.balance,
      profit: summary.profit,
      betCount: bets.filter((bet) => bet.bankrollId === br.id).length,
      pendingCount: bets.filter((bet) => bet.bankrollId === br.id && bet.result === "EN_ATTENTE").length,
      locked: br.locked,
    };
  });

  const t = await getTranslations("bankrolls");
  const currency = await getServerCurrency();

  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="text-xl font-semibold">{t("title")}</h1>
        <p className="mt-1 text-xs text-muted-foreground">{t("subtitle", { count: bankrolls.length })}</p>
      </header>
      <BankrollList
        bankrolls={items}
        currency={currency}
        initialCreateOpen={create === "1"}
      />
    </div>
  );
}
