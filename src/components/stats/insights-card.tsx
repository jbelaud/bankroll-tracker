"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Sparkle,
  CheckCircle,
  Warning,
  Lightbulb,
  CircleNotch,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { generateInsightsAction } from "@/lib/actions/insights";
import { INSIGHTS_COOLDOWN_DAYS, type InsightResult } from "@/lib/insights/types";


export function InsightsCard({
  settledCount,
  initialInsight,
  initialCooldownUntil,
}: {
  settledCount: number;
  // Pré-chargés côté serveur (table Insight) — le cooldown et la dernière
  // analyse survivent donc à un rechargement de page, contrairement à un
  // état purement client.
  initialInsight: InsightResult | null;
  initialCooldownUntil: number | null;
}) {
  const [insight, setInsight] = useState<InsightResult | null>(initialInsight);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [cooldownUntil, setCooldownUntil] = useState<number | null>(initialCooldownUntil);
  const [renderedAt] = useState(() => Date.now());
  const t = useTranslations("stats.insights");

  const onCooldown = cooldownUntil != null && renderedAt < cooldownUntil;
  const daysLeft = onCooldown
    ? Math.ceil((cooldownUntil! - renderedAt) / (24 * 60 * 60 * 1000))
    : 0;

  if (settledCount < 3) {
    return (
      <section aria-label={t("ariaLabel")} className="glass-card flex items-center gap-2 rounded-xl p-4">
        <Sparkle size={16} className="shrink-0 text-muted-foreground" aria-hidden />
        <p className="text-sm text-muted-foreground">{t("locked")}</p>
      </section>
    );
  }

  const handleGenerate = async () => {
    if (onCooldown || loading) return;
    setLoading(true);
    setError("");
    try {
      const result = await generateInsightsAction();
      if ("error" in result) {
        setError(result.error);
      } else {
        setInsight(result.insight);
        setCooldownUntil(result.cooldownUntil);
      }
    } catch {
      setError(t("errorGeneric"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <section aria-label={t("ariaLabel")} className="glass-card flex flex-col gap-3 rounded-xl p-4">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold">
          <Sparkle size={15} className="text-primary" weight="fill" aria-hidden />
          {t("title")}
        </h2>
        <Button
          onClick={handleGenerate}
          disabled={loading || onCooldown}
          variant="ghost"
          className="min-h-touch rounded-lg text-xs text-primary"
          title={onCooldown ? t("cooldownTooltip", { days: daysLeft }) : undefined}
        >
          {loading ? (
            <CircleNotch size={14} className="animate-spin" aria-hidden />
          ) : (
            <Sparkle size={14} aria-hidden />
          )}
          {insight ? t("regenerate") : t("generate")}
        </Button>
      </div>

      {onCooldown && (
        <p className="text-xs text-muted-foreground">
          {t("cooldownMessage", { days: daysLeft, cooldownDays: INSIGHTS_COOLDOWN_DAYS })}
        </p>
      )}
      {error && (
        <p role="alert" className="flex items-center gap-1.5 text-xs text-loss">
          <Warning size={13} weight="fill" aria-hidden />
          {error}
        </p>
      )}
      {loading && <p className="text-sm text-muted-foreground">{t("generating")}</p>}
      {!insight && !loading && !error && !onCooldown && (
        <p className="text-sm text-muted-foreground">{t("emptyPrompt")}</p>
      )}

      {insight && (
        <div className="flex flex-col gap-3">
          <p className="text-sm">{insight.appreciation}</p>

          <div className="rounded-lg bg-profit-muted p-3">
            <h3 className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-profit">
              <CheckCircle size={14} weight="fill" aria-hidden />
              {t("strengths")}
            </h3>
            <ul className="flex flex-col gap-1 text-xs text-foreground">
              {insight.points_forts.map((p, i) => (
                <li key={i}>• {p}</li>
              ))}
            </ul>
          </div>

          <div className="rounded-lg bg-warning-muted p-3">
            <h3 className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-warning">
              <Warning size={14} weight="fill" aria-hidden />
              {t("improvements")}
            </h3>
            <ul className="flex flex-col gap-1 text-xs text-foreground">
              {insight.points_amelioration.map((p, i) => (
                <li key={i}>• {p}</li>
              ))}
            </ul>
          </div>

          <div className="rounded-lg bg-primary/10 p-3">
            <h3 className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-primary">
              <Lightbulb size={14} weight="fill" aria-hidden />
              {t("recommendations")}
            </h3>
            <ul className="flex flex-col gap-1 text-xs text-foreground">
              {insight.recommandations.map((p, i) => (
                <li key={i}>• {p}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </section>
  );
}
