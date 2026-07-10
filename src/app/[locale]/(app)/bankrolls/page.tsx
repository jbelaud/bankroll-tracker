import { getTranslations } from "next-intl/server";
import { listBankrolls } from "@/lib/actions/bankrolls";
import { listAllBets } from "@/lib/actions/bets";
import { summarizeBankrolls } from "@/lib/summaries";
import { getServerCurrency } from "@/lib/get-server-currency";
import {
  BankrollList,
  type BankrollListItem,
} from "@/components/bankrolls/bankroll-list";

export default async function BankrollsPage() {
  const [bankrolls, bets] = await Promise.all([listBankrolls(), listAllBets()]);
  const summaries = summarizeBankrolls(bankrolls, bets);

  const items: BankrollListItem[] = bankrolls.map((br) => {
    const summary = summaries.find((s) => s.id === br.id)!;
    return {
      id: br.id,
      name: br.name,
      bookmaker: br.bookmaker,
      initial: br.initial,
      balance: summary.balance,
      profit: summary.profit,
    };
  });

  const t = await getTranslations("bankrolls");
  const currency = await getServerCurrency();

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">{t("title")}</h1>
      <BankrollList bankrolls={items} currency={currency} />
    </div>
  );
}
