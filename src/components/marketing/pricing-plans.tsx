import { useTranslations } from "next-intl";
import { CheckCircle } from "@phosphor-icons/react/dist/ssr";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { formatPrice, PREMIUM_PRICING } from "@/lib/billing/catalog";

export function PricingPlans({ locale }: { locale: Locale }) {
  const t = useTranslations("pricingPlans");
  const values = {
    monthlyPrice: formatPrice(PREMIUM_PRICING.monthly.amount, locale),
    yearlyPrice: formatPrice(PREMIUM_PRICING.yearly.amount, locale),
    welcomeMonthlyPrice: formatPrice(PREMIUM_PRICING.monthly.welcomeAmount, locale),
    welcomeYearlyPrice: formatPrice(PREMIUM_PRICING.yearly.welcomeAmount, locale),
  };
  return <div className="space-y-5">
    <p className="rounded-xl border border-primary/25 bg-primary/5 px-4 py-3 text-sm leading-6">{t("availability")}</p>
    <div className="grid gap-4 lg:grid-cols-2">
      <article className="marketing-card flex flex-col p-6 sm:p-8">
        <h3 className="text-xl font-semibold">{t("freeTitle")}</h3>
        <p className="mt-4 text-4xl font-semibold tracking-tight">{formatPrice(0, locale)}</p>
        <p className="mt-2 text-sm text-muted-foreground">{t("freeDescription")}</p>
        <ul className="my-6 space-y-3 text-sm">
          {(["freeBankrolls", "freeScans", "freeCard"] as const).map((key) => <li key={key} className="flex gap-2"><CheckCircle size={19} className="shrink-0 text-profit" aria-hidden />{t(key)}</li>)}
        </ul>
        <Link href="/signup" locale={locale} className="marketing-secondary-cta mt-auto justify-center">{t("freeCta")}</Link>
      </article>
      <article className="marketing-card flex flex-col border-primary/40 p-6 sm:p-8">
        <h3 className="text-xl font-semibold">{t("premiumTitle")}</h3>
        <p className="mt-4 text-4xl font-semibold tracking-tight">{values.monthlyPrice}<span className="text-base font-normal text-muted-foreground">{t("perMonth")}</span></p>
        <p className="mt-2 text-sm text-muted-foreground">{t("annualPrice", values)}</p>
        <ul className="my-6 space-y-3 text-sm">
          {(["premiumScans", "premiumBonus", "premiumBankrolls", "cancellation"] as const).map((key) => <li key={key} className="flex gap-2"><CheckCircle size={19} className="shrink-0 text-profit" aria-hidden />{t(key)}</li>)}
        </ul>
        <div className="mb-6 rounded-xl border border-primary/25 bg-primary/5 p-4">
          <h4 className="text-sm font-semibold">{t("welcomeTitle")}</h4>
          <p className="mt-2 text-sm leading-6">{t("welcomeMonthly", values)}</p>
          <p className="mt-2 text-sm leading-6">{t("welcomeYearly", values)}</p>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">{t("welcomeEligibility")}</p>
          <Link href="/offre-bienvenue" locale={locale} className="mt-3 inline-flex text-sm font-semibold text-primary underline underline-offset-4">{t("welcomeLink")}</Link>
        </div>
        <Link href="/account/subscription" locale={locale} className="marketing-primary-cta mt-auto justify-center">{t("premiumCta")}</Link>
      </article>
    </div>
    <p className="text-sm leading-6 text-muted-foreground">{t("creditConditions")}</p>
    <p className="text-xs leading-5 text-muted-foreground">{t("renewalConditions", values)}</p>
  </div>;
}
