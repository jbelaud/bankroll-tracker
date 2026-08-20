import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Wallet } from "@phosphor-icons/react/dist/ssr";
import { listBankrolls } from "@/lib/actions/bankrolls";
import { getServerCurrency } from "@/lib/get-server-currency";
import { ScanFlow } from "@/components/scan/scan-flow";
import { requireUser } from "@/lib/auth";
import { getUserTaxonomy } from "@/lib/taxonomy";

export default async function ScanPage() {
  const user = await requireUser();
  const [bankrolls, taxonomy] = await Promise.all([listBankrolls(), getUserTaxonomy(user.id)]);
  const activeBankrolls = bankrolls.filter((bankroll) => !bankroll.locked);
  const t = await getTranslations("scan");
  const tCommon = await getTranslations("common");

  if (activeBankrolls.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 py-24 text-center animate-fade-in-up">
        <div className="glass-card flex size-16 items-center justify-center rounded-2xl">
          <Wallet size={30} className="text-primary" aria-hidden />
        </div>
        <div className="flex flex-col gap-1">
          <h1 className="text-lg font-semibold">{t("noBankroll.title")}</h1>
          <p className="max-w-60 text-sm text-muted-foreground">
            {t("noBankroll.description")}
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

  const currency = await getServerCurrency();

  return (
    <div className="flex flex-1 flex-col gap-4">
      <h1 className="text-xl font-semibold">{t("title")}</h1>
      <ScanFlow
        bankrolls={activeBankrolls.map((br) => ({
          id: br.id,
          name: br.name,
          bookmaker: br.bookmaker,
        }))}
        currency={currency}
        taxonomy={taxonomy}
      />
    </div>
  );
}
