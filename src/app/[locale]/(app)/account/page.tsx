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
import { PublicTipsterProfileForm } from "@/components/account/public-tipster-profile-form";
import { PublicBankrollOrder } from "@/components/account/public-bankroll-order";
import { PersonalConversionForm } from "@/components/account/personal-conversion-form";

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

  const [dbUser, bets, qualityReports, betaProgram, publicBankrolls] = await Promise.all([
    prisma.user.findUnique({ where: { id: user.id }, include: { personalConversion: true } }),
    listAllBets(),
    prisma.scanQualityReport.findMany({ where: { userId: user.id }, select: { id: true, bookmaker: true, createdAt: true }, orderBy: { createdAt: "desc" } }),
    prisma.betaProgram.findUnique({ where: { id: "global" }, select: { phase: true } }),
    prisma.bankroll.findMany({
      where: { userId: user.id, certificationStartedAt: { not: null } },
      orderBy: [{ publicOrder: "asc" }, { publishedAt: "desc" }, { createdAt: "desc" }, { id: "asc" }],
      select: { id: true, name: true, isPublic: true },
    }),
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
  const sections = ["tracking", "public", "preferences", "help", "privacy"] as const;

  return (
    <div className="min-w-0 space-y-8 pb-4">
      <header className="space-y-3">
        <div><h1 className="text-2xl font-semibold">{t("title")}</h1><p className="mt-1 text-sm text-muted-foreground">{t("intro")}</p></div>
        <ProfileHeader email={user.email ?? ""} />
        <nav aria-label={t("sections.overview")} className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
          {sections.map((section) => <a key={section} href={`#${section}`} className="flex min-h-touch shrink-0 items-center rounded-full border border-border bg-card/60 px-4 text-xs font-semibold hover:border-primary/50 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{t(`sections.${section}`)}</a>)}
        </nav>
      </header>

      <section id="tracking" aria-labelledby="tracking-title" className="scroll-mt-20 space-y-3">
        <h2 id="tracking-title" className="text-base font-semibold">{t("sections.tracking")}</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          <AccountGoalsCard monthProfit={monthProfit} initialProfitGoal={dbUser?.monthlyProfitGoal ?? 0} initialLossLimit={dbUser?.monthlyLossLimit ?? 0} currency={dbUser?.currency ?? "EUR"} />
          <PlanCard plan={dbUser?.plan ?? "FREE"} currentPeriodEnd={dbUser?.subscriptionCurrentPeriodEnd ?? null} betaOfferEligible={canUseBetaOffer({ email: user.email, betaOfferUsedAt: dbUser?.betaOfferUsedAt ?? null })} initialCreditsRemaining={dbUser?.initialScanCreditRemaining ?? 0} initialCreditsExpiresAt={dbUser?.initialScanCreditExpiresAt ?? null} betaPhaseActive={betaProgram?.phase !== "ENDED"} />
        </div>
        <PersonalConversionForm settings={dbUser?.personalConversion ?? null} currency={dbUser?.currency ?? "EUR"} locale={locale} />
      </section>

      <section id="public" aria-labelledby="public-title" className="scroll-mt-20 space-y-3">
        <h2 id="public-title" className="text-base font-semibold">{t("sections.public")}</h2>
        <PublicTipsterProfileForm profile={{
          publicDisplayName: dbUser?.publicDisplayName ?? null,
          publicHandle: dbUser?.publicHandle ?? null,
          publicBio: dbUser?.publicBio ?? null,
          publicAvatarUrl: dbUser?.publicAvatarUrl ?? null,
          publicBannerUrl: dbUser?.publicBannerUrl ?? null,
          publicXHandle: dbUser?.publicXHandle ?? null,
        }} googleAvatarUrl={typeof user.user_metadata?.avatar_url === "string" ? user.user_metadata.avatar_url : null} />
        <PublicBankrollOrder bankrolls={publicBankrolls} />
        <div className="grid gap-3 sm:grid-cols-2">
          <Link href="/tipsters" className="glass-card flex min-h-touch items-center justify-center rounded-xl px-4 py-3 text-center text-sm font-semibold text-primary">{t("tipstersLink")}</Link>
          <Link href="/referrals" className="glass-card flex min-h-touch items-center justify-center rounded-xl px-4 py-3 text-center text-sm font-semibold text-primary">{t("referralLink")}</Link>
        </div>
      </section>

      <section id="preferences" aria-labelledby="preferences-title" className="scroll-mt-20 space-y-3">
        <h2 id="preferences-title" className="text-base font-semibold">{t("sections.preferences")}</h2>
        <div className="grid gap-4 sm:grid-cols-2"><LanguageSwitcher /><CurrencySwitcher currency={dbUser?.currency ?? "EUR"} /></div>
      </section>

      <section id="help" aria-labelledby="help-title" className="scroll-mt-20 space-y-3">
        <h2 id="help-title" className="text-base font-semibold">{t("sections.help")}</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          <section aria-label={t("discord.sectionTitle")} className="glass-card flex flex-col gap-3 rounded-xl p-4">
            <div className="flex gap-3">
              <DiscordLogoIcon size={24} weight="fill" className="mt-0.5 shrink-0 text-primary" aria-hidden />
              <div>
                <h3 className="text-sm font-semibold">{t("discord.sectionTitle")}</h3>
                <p className="mt-1 text-xs text-muted-foreground">{t("discord.sectionDescription")}</p>
              </div>
            </div>
            <a href="https://discord.gg/aMc8jDAAx" target="_blank" rel="noopener noreferrer" className="flex min-h-touch items-center justify-center gap-2 rounded-lg border border-primary/35 px-4 text-sm font-semibold text-primary transition-colors hover:bg-primary/10">
              {t("discord.join")}
              <ArrowSquareOutIcon size={16} aria-hidden />
            </a>
          </section>
          <section aria-label={t("feedback.sectionTitle")} className="glass-card flex flex-col gap-3 rounded-xl p-4">
            <div>
              <h3 className="text-sm font-semibold">{t("feedback.sectionTitle")}</h3>
              <p className="mt-1 text-xs text-muted-foreground">{t("feedback.sectionDescription")}</p>
            </div>
            <FeedbackButton />
          </section>
        </div>
      </section>

      <section id="privacy" aria-labelledby="privacy-title" className="scroll-mt-20 space-y-3">
        <h2 id="privacy-title" className="text-base font-semibold">{t("sections.privacy")}</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          <section aria-label={t("data.title")} className="glass-card flex flex-col gap-3 rounded-xl p-4">
            <h3 className="text-sm font-semibold">{t("data.title")}</h3>
            <ExportDataButton />
          </section>
          <section aria-label={t("security.title")} className="glass-card flex flex-col gap-3 rounded-xl p-4">
            <h3 className="text-sm font-semibold">{t("security.title")}</h3>
            <SignOutButton />
          </section>
        </div>
        <ScanQualityReports reports={qualityReports.map((report) => ({ ...report, createdAt: report.createdAt.toISOString() }))} />
        {isAdminEmail(user.email) && <Link href="/admin" className="glass-card flex min-h-touch items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold text-primary">{t("adminLink")}</Link>}
      </section>
    </div>
  );
}
