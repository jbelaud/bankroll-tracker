"use client";

import { useEffect } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { ScanWalletSummary, ScanWalletBatch } from "@/lib/scan/credit-policy";
import { trackPublicGrowthEvent } from "@/lib/growth/client";

export function ScanCreditSummary({ wallet, compact = false }: { wallet: ScanWalletSummary; compact?: boolean }) {
  const t = useTranslations("scanCredits");
  const locale = useLocale();
  const date = (value: string) => new Intl.DateTimeFormat(locale, {
    day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Paris",
  }).format(new Date(value));
  const active = wallet.batches.filter((b) => b.remaining > 0);
  const expiring = active.filter((b) => b.expiresAt || b.type === "MONTHLY");
  const permanent = active.filter((b) => !b.expiresAt && b.type !== "MONTHLY");
  const label = (lot: ScanWalletBatch) => {
    if (lot.origin === "SUBSCRIPTION_HISTORY_IMPORT") return t("origins.historyImport");
    if (lot.origin === "LEGACY_REFERRAL_BALANCE") return t("origins.legacyReferral");
    if (lot.origin === "BETA_REFERRAL") return t("origins.betaReferral");
    return lot.type === "MONTHLY" ? t("types.MONTHLY") : `${t(`types.${lot.type}`)} · ${lot.origin}`;
  };
  const alert = Boolean(wallet.expiringSoon > 0 && wallet.nextExpiry);
  useEffect(() => {
    if (!alert) return;
    try {
      if (sessionStorage.getItem("scan-expiry-alert-shown")) return;
      sessionStorage.setItem("scan-expiry-alert-shown", "1");
    } catch { /* L'alerte fonctionne également sans stockage navigateur. */ }
    // Aucun solde, identifiant de lot ou date n'est transmis par le navigateur.
    void trackPublicGrowthEvent("scan_expiry_alert_shown");
  }, [alert]);

  const list = (lots: ScanWalletBatch[]) => <ul className="space-y-2">
    {lots.map((lot) => <li key={lot.id} className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-xs">
      <span className="min-w-0 break-words">{label(lot)}</span>
      <span className="num font-semibold">{t("count", { count: lot.remaining })}</span>
      <span className="w-full text-muted-foreground">{lot.expiresAt
        ? t("expires", { date: date(lot.expiresAt) })
        : lot.type === "MONTHLY" ? t("startsOnFirstUse") : t("noExpiry")}</span>
    </li>)}
  </ul>;

  return <div className="space-y-3">
    {!compact && <h2 className="text-lg font-semibold">{t("total", { count: wallet.totalAvailable })}</h2>}
    {wallet.totalAvailable === 0 && <p className="text-sm text-muted-foreground">{t("empty")}</p>}
    {alert && wallet.nextExpiry && <p role="status" className="rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm">
      {t("alert", { count: wallet.nextExpiryCount, date: date(wallet.nextExpiry) })}
    </p>}
    {expiring.length > 0 && <section className="rounded-lg border border-border p-3">
      <h3 className="mb-2 text-xs font-semibold">{t("expiringTitle")}</h3>{list(expiring)}
    </section>}
    {permanent.length > 0 && <section className="rounded-lg border border-profit/30 bg-profit/5 p-3">
      <h3 className="mb-2 text-xs font-semibold">{t("permanentTitle", { count: wallet.permanentRemaining })}</h3>{list(permanent)}
    </section>}
  </div>;
}
