import type { Metadata } from "next";
import { connection } from "next/server";
import { getTranslations } from "next-intl/server";
import { CheckCircle, Gift } from "@phosphor-icons/react/dist/ssr";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { marketingMetadata } from "@/lib/marketing-seo";
import { isBetaPhaseActive } from "@/lib/beta/program";
import { formatPrice, PREMIUM_PRICING } from "@/lib/billing/catalog";
import { isWelcomeOfferOpen, WELCOME_OFFER_LIMIT } from "@/lib/billing/welcome-offer";

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "welcomeOffer" });
  return marketingMetadata({ locale, path: "/offre-bienvenue", title: t("metaTitle"), description: t("metaDescription") });
}

export default async function WelcomeOfferPage({ params }: { params: Promise<{ locale: Locale }> }) {
  await connection();
  const { locale } = await params;
  const [t, betaActive] = await Promise.all([
    getTranslations({ locale, namespace: "welcomeOffer" }), isBetaPhaseActive(),
  ]);
  const open = isWelcomeOfferOpen();
  return <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-20">
    <header className="mx-auto max-w-3xl text-center">
      <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary"><Gift size={18} aria-hidden />{t("badge")}</span>
      <h1 className="mt-6 text-3xl font-semibold tracking-tight sm:text-5xl">{t("title")}</h1>
      <p className="mt-5 text-base leading-7 text-muted-foreground sm:text-lg">{t("intro")}</p>
      <p className="mt-5 text-sm font-semibold">{t("deadline")}</p>
    </header>
    <div role="status" className="my-8 rounded-xl border border-primary/25 bg-primary/5 p-5 text-sm leading-6">
      {t(!open ? "expired" : betaActive ? "betaActive" : "available")}
    </div>
    <div className="grid gap-5 md:grid-cols-2">
      {(["monthly", "yearly"] as const).map((interval) => <article key={interval} className="marketing-card flex flex-col p-6 sm:p-8">
        <h2 className="text-xl font-semibold">{t(interval)}</h2>
        <p className="mt-5 text-4xl font-semibold">{formatPrice(PREMIUM_PRICING[interval].welcomeAmount, locale)}<span className="text-base font-normal text-muted-foreground">{t(`${interval}Unit`)}</span></p>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">{t(`${interval}Renewal`, { price: formatPrice(PREMIUM_PRICING[interval].amount, locale) })}</p>
        <ul className="my-6 space-y-3 text-sm leading-6">
          {(["scans", "bonus", "cancel"] as const).map((key) => <li key={key} className="flex gap-2"><CheckCircle size={20} className="mt-0.5 shrink-0 text-profit" aria-hidden />{t(key)}</li>)}
        </ul>
        <Link href={open ? "/account/subscription" : "/pricing"} locale={locale} className="marketing-primary-cta mt-auto justify-center">{t(!open ? "standardCta" : betaActive ? "betaCta" : "offerCta")}</Link>
      </article>)}
    </div>
    <section className="mt-10 rounded-2xl border border-border p-6 sm:p-8">
      <h2 className="text-xl font-semibold">{t("eligibilityTitle")}</h2>
      <div className="mt-5 grid gap-6 md:grid-cols-2">
        <div><h3 className="font-semibold">{t("betaTitle")}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{t("betaEligibility")}</p></div>
        <div><h3 className="font-semibold">{t("earlyTitle", { count: WELCOME_OFFER_LIMIT })}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{t("earlyEligibility", { count: WELCOME_OFFER_LIMIT })}</p></div>
      </div>
      <p className="mt-6 text-sm leading-6 text-muted-foreground">{t("accountCheck")}</p>
    </section>
    <section className="mt-8 space-y-3 text-sm leading-6 text-muted-foreground">
      <h2 className="font-semibold text-foreground">{t("conditionsTitle")}</h2>
      <p>{t("conditions")}</p><p>{t("creditConditions")}</p>
      <p><Link href="/sales-terms" locale={locale} className="underline underline-offset-4">{t("terms")}</Link> · <Link href="/contact" locale={locale} className="underline underline-offset-4">{t("contact")}</Link></p>
    </section>
  </div>;
}
