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
}: {
  plan: Plan;
  currentPeriodEnd: Date | null;
  betaOfferEligible: boolean;
  initialCreditsRemaining: number;
  initialCreditsExpiresAt: Date | null;
  betaPhaseActive: boolean;
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
