"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { Plan } from "@prisma/client";
import { Scan, Crown, CircleNotch } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { createCheckoutSessionAction } from "@/lib/actions/billing";
import { isPaidPlan } from "@/lib/billing/plans";

// Widget d'engagement/conversion sur le Dashboard — distinct de PlanCard
// (écran Compte, informatif : date de renouvellement, gestion d'abonnement).
// Ici l'objectif est différent : rendre le quota visible au quotidien et
// donner envie de cliquer sur Premium au bon moment (quand ça se resserre).
export function QuotaCard({
  plan,
  scansUsed,
  scansLimit,
  initialCreditsRemaining,
  initialCreditsExpiresAt,
  betaPhaseActive,
}: {
  plan: Plan;
  scansUsed: number;
  scansLimit: number;
  initialCreditsRemaining: number;
  initialCreditsExpiresAt: Date | null;
  betaPhaseActive: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const t = useTranslations("dashboard.quota");
  const locale = useLocale();
  const paidPlan = isPaidPlan(plan);

  const remaining = Math.max(0, scansLimit - scansUsed);
  const pct = scansLimit > 0 ? Math.min(100, (scansUsed / scansLimit) * 100) : 0;
  const barColor = pct >= 90 ? "bg-loss" : pct >= 60 ? "bg-warning" : "bg-primary";

  const handleUpgrade = async () => {
    setLoading(true);
    setError("");
    const result = await createCheckoutSessionAction();
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
  };

  return (
    <section
      aria-label={t("title")}
      className={cn(
        "glass-card flex flex-col gap-3 rounded-xl p-4",
        plan === "FREE" && pct >= 90 && "border-warning/50"
      )}
    >
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold">
          <Scan size={15} className="text-primary" weight="fill" aria-hidden />
          {t("title")}
        </h2>
        {paidPlan && (
          <span className="flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-[0.65rem] font-semibold text-primary">
            <Crown size={11} weight="fill" aria-hidden />
            {t("premiumBadge")}
          </span>
        )}
      </div>

      {initialCreditsRemaining > 0 && initialCreditsExpiresAt && (
        <p className="rounded-lg bg-primary/10 px-3 py-2 text-xs leading-relaxed text-primary">
          {t("initialCredits", {
            count: initialCreditsRemaining,
            date: new Intl.DateTimeFormat(locale, {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
            }).format(initialCreditsExpiresAt),
          })}
        </p>
      )}

      <div className="flex flex-col gap-1.5">
        <div className="flex items-baseline justify-between">
          <span className="num text-2xl font-bold tracking-tight">{remaining}</span>
          <span className="num text-xs text-muted-foreground">
            {t("remaining", { used: scansUsed, limit: scansLimit })}
          </span>
        </div>
        <div
          role="progressbar"
          aria-valuenow={Math.round(pct)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={t("title")}
          className="h-1.5 overflow-hidden rounded-full bg-muted"
        >
          <div
            className={cn("h-full rounded-full transition-all", barColor)}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {error && (
        <p role="alert" className="text-xs text-loss">
          {error}
        </p>
      )}

      {!betaPhaseActive && plan === "FREE" && (
        <Button
          onClick={handleUpgrade}
          disabled={loading}
          className="min-h-touch w-full rounded-lg bg-gradient-to-r from-primary to-chart-5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-transform active:scale-[0.98]"
        >
          {loading ? (
            <CircleNotch size={15} className="animate-spin" aria-hidden />
          ) : (
            <Crown size={15} weight="fill" aria-hidden />
          )}
          {t("upgradeCta")}
        </Button>
      )}
    </section>
  );
}
