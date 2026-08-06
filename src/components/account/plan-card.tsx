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
}: {
  plan: Plan;
  currentPeriodEnd: Date | null;
  betaOfferEligible: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const t = useTranslations("account.plan");
  const locale = useLocale();

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

  return (
    <section aria-label={t("title")} className="glass-card flex flex-col gap-3 rounded-xl p-4">
      <h2 className="flex items-center gap-1.5 text-sm font-semibold">
        <Crown size={15} className="text-primary" weight="fill" aria-hidden />
        {t("title")}
      </h2>

      <p className="text-sm text-muted-foreground">
        {plan === "PREMIUM"
          ? currentPeriodEnd
            ? t("premiumActive", { date: fmtRenewalDate(currentPeriodEnd, locale) })
            : t("premiumActiveNoDate")
          : t("freeDescription")}
      </p>

      {plan === "FREE" && betaOfferEligible && (
        <p className="text-xs leading-relaxed text-muted-foreground">
          {t("betaOfferDetails")}
        </p>
      )}

      {error && (
        <p role="alert" className="text-xs text-loss">
          {error}
        </p>
      )}

      {plan === "PREMIUM" ? (
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
