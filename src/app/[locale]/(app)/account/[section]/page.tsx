import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { ArrowLeftIcon, ArrowSquareOutIcon, DiscordLogoIcon } from "@phosphor-icons/react/dist/ssr";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { listAllBets } from "@/lib/actions/bets";
import { computeProfit } from "@/lib/profit";
import { canUseBetaOffer } from "@/lib/billing/beta-offer";
import { LanguageSwitcher } from "@/components/account/language-switcher";
import { CurrencySwitcher } from "@/components/account/currency-switcher";
import { PlanCard } from "@/components/account/plan-card";
import { AccountGoalsCard } from "@/components/account/account-goals-card";
import { PersonalConversionForm } from "@/components/account/personal-conversion-form";
import { PublicTipsterProfileForm } from "@/components/account/public-tipster-profile-form";
import { PublicBankrollOrder } from "@/components/account/public-bankroll-order";
import { ExportDataButton } from "@/components/account/export-data-button";
import { ScanQualityReports } from "@/components/account/scan-quality-reports";
import { SignOutButton } from "@/components/account/sign-out-button";
import { FeedbackButton } from "@/components/account/feedback-button";

const sectionKeys = ["profile", "subscription", "tracking", "public-profile", "data", "help"] as const;
type Section = (typeof sectionKeys)[number];

export default async function AccountSectionPage({ params }: { params: Promise<{ locale: Locale; section: string }> }) {
  const { locale, section } = await params;
  if (!sectionKeys.includes(section as Section)) notFound();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const t = await getTranslations("account");
  const titleKey = (section === "public-profile" ? "public" : section) as "profile" | "subscription" | "tracking" | "public" | "data" | "help";
  let content: React.ReactNode;

  switch (section) {
    case "profile": {
      const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { currency: true } });
      content = <div className="space-y-6">
        <section className="border-b border-border pb-5">
          <h2 className="text-sm font-semibold">{t("navigation.privateIdentity")}</h2>
          <p className="mt-2 break-all text-sm text-muted-foreground">{user.email}</p>
        </section>
        <div className="space-y-3"><LanguageSwitcher /><CurrencySwitcher currency={dbUser?.currency ?? "EUR"} /></div>
      </div>;
      break;
    }
    case "subscription": {
      const [dbUser, betaProgram] = await Promise.all([
        prisma.user.findUnique({ where: { id: user.id }, select: { plan: true, subscriptionCurrentPeriodEnd: true, betaOfferUsedAt: true, initialScanCreditRemaining: true, initialScanCreditExpiresAt: true } }),
        prisma.betaProgram.findUnique({ where: { id: "global" }, select: { phase: true } }),
      ]);
      content = <PlanCard plan={dbUser?.plan ?? "FREE"} currentPeriodEnd={dbUser?.subscriptionCurrentPeriodEnd ?? null} betaOfferEligible={canUseBetaOffer({ email: user.email, betaOfferUsedAt: dbUser?.betaOfferUsedAt ?? null })} initialCreditsRemaining={dbUser?.initialScanCreditRemaining ?? 0} initialCreditsExpiresAt={dbUser?.initialScanCreditExpiresAt ?? null} betaPhaseActive={betaProgram?.phase !== "ENDED"} />;
      break;
    }
    case "tracking": {
      const [dbUser, bets] = await Promise.all([
        prisma.user.findUnique({ where: { id: user.id }, include: { personalConversion: true } }),
        listAllBets(),
      ]);
      const now = new Date();
      const monthProfit = bets.filter((bet) => bet.result !== "EN_ATTENTE" && bet.date.getFullYear() === now.getFullYear() && bet.date.getMonth() === now.getMonth()).reduce((sum, bet) => sum + computeProfit(bet), 0);
      content = <div className="space-y-5">
        <AccountGoalsCard monthProfit={monthProfit} initialProfitGoal={dbUser?.monthlyProfitGoal ?? 0} initialLossLimit={dbUser?.monthlyLossLimit ?? 0} currency={dbUser?.currency ?? "EUR"} />
        <div id="personal-conversion" className="scroll-mt-24"><PersonalConversionForm settings={dbUser?.personalConversion ?? null} currency={dbUser?.currency ?? "EUR"} locale={locale} /></div>
      </div>;
      break;
    }
    case "public-profile": {
      const [dbUser, publicBankrolls] = await Promise.all([
        prisma.user.findUnique({ where: { id: user.id }, select: { publicDisplayName: true, publicHandle: true, publicBio: true, publicAvatarUrl: true, publicBannerUrl: true, publicXHandle: true } }),
        prisma.bankroll.findMany({ where: { userId: user.id, certificationStartedAt: { not: null } }, orderBy: [{ publicOrder: "asc" }, { publishedAt: "desc" }, { createdAt: "desc" }, { id: "asc" }], select: { id: true, name: true, isPublic: true } }),
      ]);
      content = <div className="space-y-5">
        <PublicTipsterProfileForm profile={{ publicDisplayName: dbUser?.publicDisplayName ?? null, publicHandle: dbUser?.publicHandle ?? null, publicBio: dbUser?.publicBio ?? null, publicAvatarUrl: dbUser?.publicAvatarUrl ?? null, publicBannerUrl: dbUser?.publicBannerUrl ?? null, publicXHandle: dbUser?.publicXHandle ?? null }} googleAvatarUrl={typeof user.user_metadata?.avatar_url === "string" ? user.user_metadata.avatar_url : null} />
        <PublicBankrollOrder bankrolls={publicBankrolls} />
      </div>;
      break;
    }
    case "data": {
      const reports = await prisma.scanQualityReport.findMany({ where: { userId: user.id }, select: { id: true, bookmaker: true, createdAt: true }, orderBy: { createdAt: "desc" } });
      content = <div className="space-y-6">
        <section className="border-b border-border pb-6"><h2 className="mb-3 text-sm font-semibold">{t("data.title")}</h2><ExportDataButton /></section>
        <ScanQualityReports reports={reports.map((report) => ({ ...report, createdAt: report.createdAt.toISOString() }))} />
        <section className="border-t border-border pt-6"><h2 className="mb-3 text-sm font-semibold">{t("security.title")}</h2><SignOutButton /></section>
      </div>;
      break;
    }
    case "help": {
      content = <div className="space-y-6">
        <section className="border-b border-border pb-6"><div className="flex items-start gap-3"><DiscordLogoIcon size={22} className="shrink-0 text-primary" aria-hidden /><div><h2 className="text-sm font-semibold">{t("discord.sectionTitle")}</h2><p className="mt-1 text-sm text-muted-foreground">{t("discord.sectionDescription")}</p></div></div><a href="https://discord.gg/aMc8jDAAx" target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-lg border border-primary/35 px-4 text-sm font-semibold text-primary hover:bg-primary/10">{t("discord.join")}<ArrowSquareOutIcon size={16} aria-hidden /></a></section>
        <section><h2 className="text-sm font-semibold">{t("feedback.sectionTitle")}</h2><p className="mt-1 mb-4 text-sm text-muted-foreground">{t("feedback.sectionDescription")}</p><FeedbackButton /></section>
      </div>;
    }
  }

  return <div className="min-w-0 space-y-6">
    <header>
      <Link href="/account" className="mb-4 inline-flex min-h-11 items-center gap-2 text-sm text-muted-foreground hover:text-primary lg:hidden"><ArrowLeftIcon size={16} aria-hidden />{t("navigation.back")}</Link>
      <p className="hidden text-xs font-medium text-primary lg:block">{t("title")}</p>
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t(`navigation.${titleKey}`)}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{t(`navigation.${titleKey}Intro`)}</p>
    </header>
    {content}
  </div>;
}
