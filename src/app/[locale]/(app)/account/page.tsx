import { getTranslations } from "next-intl/server";
import { ArrowSquareOutIcon, DiscordLogoIcon } from "@phosphor-icons/react/dist/ssr";
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
import { FeedbackButton } from "@/components/account/feedback-button";
import { isAdminEmail } from "@/lib/admin";
import { canUseBetaOffer } from "@/lib/billing/beta-offer";
import { ScanQualityReports } from "@/components/account/scan-quality-reports";

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

  const [dbUser, bets, qualityReports, betaProgram] = await Promise.all([
    prisma.user.findUnique({ where: { id: user.id } }),
    listAllBets(),
    prisma.scanQualityReport.findMany({ where: { userId: user.id }, select: { id: true, bookmaker: true, createdAt: true }, orderBy: { createdAt: "desc" } }),
    prisma.betaProgram.findUnique({ where: { id: "global" }, select: { phase: true } }),
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

      <section aria-label={t("discord.sectionTitle")} className="glass-card flex flex-col gap-3 rounded-xl p-4">
        <div className="flex gap-3">
          <DiscordLogoIcon size={24} weight="fill" className="mt-0.5 shrink-0 text-primary" aria-hidden />
          <div>
            <h2 className="text-sm font-semibold">{t("discord.sectionTitle")}</h2>
            <p className="mt-1 text-xs text-muted-foreground">{t("discord.sectionDescription")}</p>
          </div>
        </div>
        <a
          href="https://discord.gg/aMc8jDAAx"
          target="_blank"
          rel="noopener noreferrer"
          className="flex min-h-touch items-center justify-center gap-2 rounded-lg border border-primary/35 px-4 text-sm font-semibold text-primary transition-colors hover:bg-primary/10"
        >
          {t("discord.join")}
          <ArrowSquareOutIcon size={16} aria-hidden />
        </a>
      </section>

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
        betaPhaseActive={betaProgram?.phase !== "ENDED"}
      />

      <LanguageSwitcher />
      <CurrencySwitcher currency={dbUser?.currency ?? "EUR"} />

      <section aria-label={t("feedback.sectionTitle")} className="glass-card flex flex-col gap-3 rounded-xl p-4">
        <div>
          <h2 className="text-sm font-semibold">{t("feedback.sectionTitle")}</h2>
          <p className="mt-1 text-xs text-muted-foreground">{t("feedback.sectionDescription")}</p>
        </div>
        <FeedbackButton />
      </section>

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

      <ScanQualityReports reports={qualityReports.map((report) => ({ ...report, createdAt: report.createdAt.toISOString() }))} />

      <section aria-label={t("security.title")} className="glass-card flex flex-col gap-3 rounded-xl p-4">
        <h2 className="text-sm font-semibold">{t("security.title")}</h2>
        <SignOutButton />
      </section>
    </div>
  );
}
