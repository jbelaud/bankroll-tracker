import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Wallet } from "@phosphor-icons/react/dist/ssr";
import { listBankrolls } from "@/lib/actions/bankrolls";
import { getServerCurrency } from "@/lib/get-server-currency";
import { ScanFlow } from "@/components/scan/scan-flow";
import { requireUser } from "@/lib/auth";
import { getUserTaxonomy } from "@/lib/taxonomy";
import { listPendingScanDrafts } from "@/lib/actions/scan-drafts";
import { listTipsters } from "@/lib/actions/tipsters";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

export default async function ScanPage({ searchParams }: { searchParams: Promise<{ resultFor?: string | string[] }> }) {
  const user = await requireUser();
  const query = await searchParams;
  const resultFor = Array.isArray(query.resultFor) ? query.resultFor[0] : query.resultFor;
  const resultProofTarget = resultFor ? await prisma.bet.findFirst({
    where: {
      id: resultFor,
      result: "EN_ATTENTE",
      certificationLockedAt: { not: null },
      bankroll: { userId: user.id, isPublic: true, certificationStartedAt: { not: null } },
    },
    select: { id: true, bankrollId: true, description: true, sport: true, betType: true },
  }) : null;
  if (resultFor && !resultProofTarget) notFound();
  const [bankrolls, taxonomy, pendingDrafts, tipsters, t, tCommon, currency] = await Promise.all([
    listBankrolls(),
    getUserTaxonomy(user.id),
    listPendingScanDrafts(),
    listTipsters(),
    getTranslations("scan"),
    getTranslations("common"),
    getServerCurrency(),
  ]);
  const activeBankrolls = bankrolls.filter((bankroll) => !bankroll.locked);

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
          href="/bankrolls?create=1&next=/scan"
          className="flex min-h-touch items-center rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground transition-transform active:scale-95"
        >
          {tCommon("createBankrollCta")}
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-4">
      <h1 className="text-xl font-semibold">{t("title")}</h1>
      <ScanFlow
        bankrolls={activeBankrolls.map((br) => ({
          id: br.id,
          name: br.name,
          mode: br.mode,
          bookmaker: br.bookmaker,
          referenceCapital: br.referenceCapital,
          allocations: br.allocations,
        }))}
        currency={currency}
        taxonomy={taxonomy}
        pendingDrafts={pendingDrafts}
        tipsters={tipsters.map(({ id, name, normalizedName, status }) => ({ id, name, normalizedName, status }))}
        resultProofTarget={resultProofTarget ? {
          betId: resultProofTarget.id,
          bankrollId: resultProofTarget.bankrollId,
          label: resultProofTarget.description || `${resultProofTarget.sport} · ${resultProofTarget.betType}`,
        } : undefined}
      />
    </div>
  );
}
