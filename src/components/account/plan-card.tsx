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
import { BILLING_UI_ENABLED, isPaidPlan } from "@/lib/billing/plans";

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
}: {
  plan: Plan;
  currentPeriodEnd: Date | null;
  betaOfferEligible: boolean;
  initialCreditsRemaining: number;
  initialCreditsExpiresAt: Date | null;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const t = useTranslations("account.plan");
  const locale = useLocale();
  const paidPlan = isPaidPlan(plan);

  const handleUpgrade = async () => {
    setLoading(true);
    setError("");
    const result = await createCheckoutSessionAction();
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

  if (!BILLING_UI_ENABLED) {
    return (
      <section aria-label={t("betaTestingTitle")} className="glass-card relative overflow-hidden rounded-xl p-4">
        <div className="pointer-events-none select-none blur-sm opacity-35" aria-hidden>
          <div className="mb-3 h-4 w-28 rounded bg-primary" />
          <div className="mb-4 h-3 w-4/5 rounded bg-muted-foreground" />
          <div className="h-10 rounded-lg bg-primary" />
        </div>
        <div className="absolute inset-0 flex items-center justify-center bg-background/15 px-6 text-center">
          <p className="text-sm font-medium">{t("betaTestingDescription")}</p>
        </div>
      </section>
    );
  }

  return (
    <section aria-label={t("title")} className="glass-card flex flex-col gap-3 rounded-xl p-4">
      <h2 className="flex items-center gap-1.5 text-sm font-semibold">
        <Crown size={15} className="text-primary" weight="fill" aria-hidden />
        {t("title")}
      </h2>

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
        </p>
      )}

      {paidPlan && initialCreditsRemaining > 0 && initialCreditsExpiresAt && (
        <p className="text-xs leading-relaxed text-primary">
          {t("initialCredits", {
            count: initialCreditsRemaining,
            date: fmtRenewalDate(initialCreditsExpiresAt, locale),
          })}
        </p>
      )}

      {error && (
        <p role="alert" className="text-xs text-loss">
          {error}
        </p>
      )}

      {paidPlan ? (
        <Button
          onClick={handleManage}
          disabled={loading}
          variant="outline"
          className="min-h-touch w-full rounded-lg text-sm"
        >
          {t("manage")}
        </Button>
      ) : (
        <Button
          onClick={handleUpgrade}
          disabled={loading}
          className="min-h-touch w-full whitespace-normal rounded-lg text-sm font-semibold"
        >
          {betaOfferEligible ? t("upgradeBeta") : t("upgradeStandard")}
        </Button>
      )}
    </section>
  );
}
