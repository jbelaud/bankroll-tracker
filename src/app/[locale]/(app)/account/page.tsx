import { getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { listAllBets } from "@/lib/actions/bets";
import { computeProfit } from "@/lib/profit";
import { ProfileHeader } from "@/components/account/profile-header";
import { AccountGoalsCard } from "@/components/account/account-goals-card";
import { ExportDataButton } from "@/components/account/export-data-button";
import { SignOutButton } from "@/components/account/sign-out-button";
import { LanguageSwitcher } from "@/components/account/language-switcher";
import { CurrencySwitcher } from "@/components/account/currency-switcher";
import { PlanCard } from "@/components/account/plan-card";
import { isAdminEmail } from "@/lib/admin";
import { canUseBetaOffer } from "@/lib/billing/beta-offer";

export default async function AccountPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect({ href: "/login", locale });
    return null;
  }

  const [dbUser, bets] = await Promise.all([
    prisma.user.findUnique({ where: { id: user.id } }),
    listAllBets(),
  ]);

  const now = new Date();
  const monthProfit = bets
    .filter(
      (b) =>
        b.result !== "EN_ATTENTE" &&
        b.date.getFullYear() === now.getFullYear() &&
        b.date.getMonth() === now.getMonth()
    )
    .reduce((s, b) => s + computeProfit(b), 0);

  const t = await getTranslations("account");

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">{t("title")}</h1>

      <ProfileHeader email={user.email ?? ""} />

      <AccountGoalsCard
        monthProfit={monthProfit}
        initialProfitGoal={dbUser?.monthlyProfitGoal ?? 0}
        initialLossLimit={dbUser?.monthlyLossLimit ?? 0}
        currency={dbUser?.currency ?? "EUR"}
      />

      <PlanCard
        plan={dbUser?.plan ?? "FREE"}
        currentPeriodEnd={dbUser?.subscriptionCurrentPeriodEnd ?? null}
        betaOfferEligible={canUseBetaOffer({
          email: user.email,
          betaOfferUsedAt: dbUser?.betaOfferUsedAt ?? null,
        })}
        initialCreditsRemaining={dbUser?.initialScanCreditRemaining ?? 0}
        initialCreditsExpiresAt={dbUser?.initialScanCreditExpiresAt ?? null}
      />

      <LanguageSwitcher />
      <CurrencySwitcher currency={dbUser?.currency ?? "EUR"} />

      {isAdminEmail(user.email) && (
        <Link
          href="/admin"
          className="glass-card min-h-touch rounded-xl px-4 py-3 text-center text-sm font-semibold text-primary"
        >
          {t("adminLink")}
        </Link>
      )}

      <section aria-label={t("data.title")} className="glass-card flex flex-col gap-3 rounded-xl p-4">
        <h2 className="text-sm font-semibold">{t("data.title")}</h2>
        <ExportDataButton />
      </section>

      <section aria-label={t("security.title")} className="glass-card flex flex-col gap-3 rounded-xl p-4">
        <h2 className="text-sm font-semibold">{t("security.title")}</h2>
        <SignOutButton />
      </section>
    </div>
  );
}
