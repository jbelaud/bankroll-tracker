import { getTranslations } from "next-intl/server";
import { Wallet } from "@phosphor-icons/react/dist/ssr";
import { Link } from "@/i18n/navigation";
import { listBankrolls } from "@/lib/actions/bankrolls";
import { FileImportFlow } from "@/components/file-import/file-import-flow";
import { listTipsters } from "@/lib/actions/tipsters";

export default async function ImportHistoryPage() {
  const [bankrolls, tipsters, t, tCommon] = await Promise.all([
    listBankrolls(),
    listTipsters(),
    getTranslations("fileImport"),
    getTranslations("common"),
  ]);
  const activeBankrolls = bankrolls.filter((bankroll) => !bankroll.locked);

  if (activeBankrolls.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 py-24 text-center animate-fade-in-up">
        <div className="glass-card flex size-16 items-center justify-center rounded-2xl"><Wallet size={30} className="text-primary" aria-hidden /></div>
        <div className="flex flex-col gap-1"><h1 className="text-lg font-semibold">{t("noBankroll.title")}</h1><p className="max-w-72 text-sm text-muted-foreground">{t("noBankroll.description")}</p></div>
        <Link href="/bankrolls?create=1&next=/import-history" className="flex min-h-touch items-center rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground">{tCommon("createBankrollCta")}</Link>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-1">
      <h1 className="text-xl font-semibold">{t("title")}</h1>
      <p className="mb-4 text-sm leading-6 text-muted-foreground">{t("description")}</p>
      <FileImportFlow
        bankrolls={activeBankrolls.map(({ id, name, bookmaker, mode, allocations }) => ({
          id,
          name,
          bookmaker: bookmaker ?? (mode === "SINGLE" ? "Solde unique" : `${allocations.length} bookmakers`),
        }))}
        tipsters={tipsters.map(({ id, name, normalizedName, status }) => ({ id, name, normalizedName, status }))}
      />
    </div>
  );
}
