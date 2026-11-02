"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { Plan } from "@prisma/client";
import { Crown } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import {
  createCheckoutSessionAction,
  createBillingPortalSessionAction,
} from "@/lib/actions/billing";
import { switchBetaTesterToFreemium } from "@/lib/actions/beta-testers";
import { isPaidPlan } from "@/lib/billing/plans";
import { PlanStatusSummary } from "./plan-status-summary";
import { formatPrice, PREMIUM_PRICING, type BillingInterval } from "@/lib/billing/catalog";
import { validatedFrenchAddress } from "@/lib/billing/contract";
import { Link } from "@/i18n/navigation";

// Contrairement à fmtDate (jour/mois, pensé pour des paris récents où
// l'année est évidente), un renouvellement d'abonnement est ~1 an dans le
// futur : l'année est nécessaire pour ne pas être ambigu.
function fmtRenewalDate(d: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, { day: "2-digit", month: "2-digit", year: "numeric" }).format(d);
}

export function PlanCard({
  plan,
  currentPeriodEnd,
  betaOfferEligible,
  initialCreditsRemaining,
  initialCreditsExpiresAt,
  betaPhaseActive,
  hasBillingCustomer = false,
}: {
  plan: Plan;
  currentPeriodEnd: Date | null;
  betaOfferEligible: boolean;
  initialCreditsRemaining: number;
  initialCreditsExpiresAt: Date | null;
  betaPhaseActive: boolean;
  hasBillingCustomer?: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [interval, setInterval] = useState<BillingInterval>("monthly");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [immediateStartRequested, setImmediateStartRequested] = useState(false);
  const [franceResident, setFranceResident] = useState(false);
  const [billingAddress, setBillingAddress] = useState({ line1: "", city: "", postalCode: "" });
  const t = useTranslations("account.plan");
  const locale = useLocale();
  const paidPlan = isPaidPlan(plan);

  const handleUpgrade = async () => {
    setLoading(true);
    setError("");
    const result = await createCheckoutSessionAction(interval, { termsAccepted, immediateStartRequested, franceResident, billingAddress });
    // Si l'action redirige (cas normal), ce code n'est jamais atteint — Next
    // navigue avant que la promesse ne se résolve côté client.
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
  };

  const handleManage = async () => {
    setLoading(true);
    setError("");
    const result = await createBillingPortalSessionAction();
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
  };

  const handleFreemium = async () => {
    setLoading(true);
    setError("");
    try {
      await switchBetaTesterToFreemium();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Impossible de modifier le plan.");
      setLoading(false);
    }
  };

  if (betaPhaseActive) {
    return (
      <section aria-label={t("title")} className="glass-card flex flex-col gap-3 rounded-xl p-4">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold">
          <Crown size={15} className="text-primary" weight="fill" aria-hidden />
          {t("title")}
        </h2>
        <PlanStatusSummary plan={plan} currentPeriodEnd={currentPeriodEnd} variant="card" />
        <p className="text-xs leading-relaxed text-muted-foreground">{t("betaTestingDescription")}</p>
        <Link href="/pricing" className="text-sm font-semibold text-primary underline-offset-4 hover:underline">{t("viewPricing")}</Link>
        <Link href="/offre-bienvenue" className="text-sm font-semibold text-primary underline-offset-4 hover:underline">{t("viewWelcomeOffer")}</Link>
      </section>
    );
  }

  if (plan === "BETA_TESTER") {
    return (
      <section aria-label={t("betaEndedTitle")} className="glass-card flex flex-col gap-3 rounded-xl p-4">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold"><Crown size={15} className="text-primary" weight="fill" aria-hidden />{t("betaEndedTitle")}</h2>
        <PlanStatusSummary plan={plan} currentPeriodEnd={currentPeriodEnd} variant="card" />
        <p className="text-sm text-muted-foreground">{t("betaEndedDescription")}</p>
        {error && <p role="alert" className="text-xs text-loss">{error}</p>}
        <Button onClick={handleFreemium} disabled={loading} className="min-h-touch w-full rounded-lg text-sm font-semibold">{t("switchToFreemium")}</Button>
      </section>
    );
  }

  return (
    <section aria-label={t("title")} className="glass-card flex flex-col gap-3 rounded-xl p-4">
      <h2 className="flex items-center gap-1.5 text-sm font-semibold">
        <Crown size={15} className="text-primary" weight="fill" aria-hidden />
        {t("title")}
      </h2>

      <PlanStatusSummary plan={plan} currentPeriodEnd={currentPeriodEnd} variant="card" />

      <p className="text-sm text-muted-foreground">
        {paidPlan
          ? currentPeriodEnd
            ? t(plan === "BETA_PREMIUM" ? "betaPremiumActive" : "premiumActive", {
                date: fmtRenewalDate(currentPeriodEnd, locale),
              })
            : t(plan === "BETA_PREMIUM" ? "betaPremiumActiveNoDate" : "premiumActiveNoDate")
          : t("freeDescription")}
      </p>

      {plan === "FREE" && betaOfferEligible && (
        <p className="text-xs leading-relaxed text-muted-foreground">
          {t("betaOfferDetails")}
          <Link href="/offre-bienvenue" className="mt-2 block font-semibold text-primary underline underline-offset-4">{t("viewWelcomeOffer")}</Link>
        </p>
      )}

      {paidPlan && initialCreditsRemaining > 0 && (
        <p className="text-xs leading-relaxed text-primary">
          {initialCreditsExpiresAt ? t("initialCredits", {
            count: initialCreditsRemaining,
            date: fmtRenewalDate(initialCreditsExpiresAt, locale),
          }) : t("permanentInitialCredits", { count: initialCreditsRemaining })}
        </p>
      )}

      {!paidPlan && hasBillingCustomer && <Button onClick={handleManage} disabled={loading} variant="outline" className="min-h-touch w-full">{t("manage")}</Button>}

      {!paidPlan && (
        <fieldset disabled={loading} className="space-y-2">
          <legend className="mb-2 text-sm font-semibold">{t("billingPeriod")}</legend>
          {(["monthly", "yearly"] as const).map((choice) => <label key={choice} className="flex min-h-touch cursor-pointer items-start gap-3 rounded-lg border border-border p-3 has-checked:border-primary">
            <input type="radio" name="billing-period" value={choice} checked={interval === choice} onChange={() => setInterval(choice)} className="mt-1 accent-primary" />
            <span className="text-sm">
              {t(choice, { price: formatPrice(betaOfferEligible ? PREMIUM_PRICING[choice].welcomeAmount : PREMIUM_PRICING[choice].amount, locale) })}
              <span className="mt-1 block text-xs text-muted-foreground">{t(betaOfferEligible ? `${choice}WelcomeRenewal` : `${choice}Renewal`, { price: formatPrice(PREMIUM_PRICING[choice].amount, locale) })}</span>
            </span>
          </label>)}
          <p className="text-xs leading-relaxed text-muted-foreground">{t("premiumCredits")}</p>
          <div className="space-y-3 rounded-lg border border-border p-3">
            <p className="text-sm font-semibold">{locale === "en" ? "Billing address — France" : "Adresse de facturation — France"}</p>
            {(["line1", "postalCode", "city"] as const).map((field) => <label key={field} className="block text-sm">
              {field === "line1" ? locale === "en" ? "Street address" : "Adresse" : field === "city" ? locale === "en" ? "City" : "Ville" : locale === "en" ? "Postal code" : "Code postal"}
              <input value={billingAddress[field]} onChange={(event) => setBillingAddress((address) => ({ ...address, [field]: event.target.value }))} autoComplete={field === "line1" ? "address-line1" : field === "city" ? "address-level2" : "postal-code"} maxLength={field === "postalCode" ? 5 : field === "city" ? 120 : 200} inputMode={field === "postalCode" ? "numeric" : "text"} className="mt-1 min-h-touch w-full rounded-md border border-border bg-background px-3 py-2" />
            </label>)}
          </div>
          <label className="flex min-h-touch items-start gap-3 py-2 text-sm">
            <input type="checkbox" checked={termsAccepted} onChange={(event) => setTermsAccepted(event.target.checked)} className="mt-1 accent-primary" />
            <span>{locale === "en" ? "I have read and accept the " : "J’ai lu et j’accepte les "}<Link href="/sales-terms" target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-4">{locale === "en" ? "sales terms" : "conditions générales de vente"}</Link>.</span>
          </label>
          <label className="flex min-h-touch items-start gap-3 py-2 text-sm">
            <input type="checkbox" checked={immediateStartRequested} onChange={(event) => setImmediateStartRequested(event.target.checked)} className="mt-1 accent-primary" />
            <span>{locale === "en" ? "I expressly request immediate service activation. I retain my 14-day withdrawal right and a full refund, even if I use scans." : "Je demande expressément l’activation immédiate du service. Je conserve mon droit de rétractation de 14 jours et un remboursement intégral, même si j’utilise des scans."}</span>
          </label>
          <label className="flex min-h-touch items-start gap-3 py-2 text-sm">
            <input type="checkbox" checked={franceResident} onChange={(event) => setFranceResident(event.target.checked)} className="mt-1 accent-primary" />
            <span>{locale === "en" ? "I reside in France. Paid subscriptions are offered in France at launch." : "Je réside en France. Les abonnements payants sont proposés en France au lancement."}</span>
          </label>
          <Link href="/privacy" className="inline-flex min-h-touch items-center text-xs text-primary underline underline-offset-4">{locale === "en" ? "How your data is used" : "Comment tes données sont utilisées"}</Link>
        </fieldset>
      )}

      {error && (
        <p role="alert" className="text-xs text-loss">
          {error}
        </p>
      )}

      <Link href="/retractation" className="inline-flex min-h-touch items-center text-xs text-primary underline underline-offset-4">
        {locale === "en" ? "Withdraw from my contract" : "Renoncer à mon contrat"}
      </Link>

      {paidPlan ? (
        <Button
          onClick={handleManage}
          disabled={loading}
          variant="outline"
          className="min-h-touch w-full rounded-lg text-sm"
        >
          {locale === "en" ? "Manage / cancel my subscription" : "Gérer / résilier mon abonnement"}
        </Button>
      ) : (
        <Button
          onClick={handleUpgrade}
          disabled={loading || !termsAccepted || !immediateStartRequested || !franceResident || !validatedFrenchAddress(billingAddress)}
          className="min-h-touch w-full whitespace-normal rounded-lg text-sm font-semibold"
        >
          {betaOfferEligible ? t("upgradeBeta") : t("upgradeStandard")}
        </Button>
      )}
    </section>
  );
}
