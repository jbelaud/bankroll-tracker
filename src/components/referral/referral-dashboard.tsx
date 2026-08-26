"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

type ReferralItem = {
  id: string;
  referredEmail: string;
  suspicious: boolean;
  validScanCount: number;
  status: "REGISTERED" | "FIRST_SCAN" | "FIVE_SCANS" | "COMPLETE";
  referrerScansUnlocked: number;
  scansUntilNextReward: number;
};

export function ReferralDashboard({
  referralLink,
  paused,
  invitedCount,
  activeCount,
  scansEarned,
  referralCreditsRemaining,
  referrals,
}: {
  referralLink: string;
  paused: boolean;
  invitedCount: number;
  activeCount: number;
  scansEarned: number;
  referralCreditsRemaining: number;
  referrals: ReferralItem[];
}) {
  const t = useTranslations("referral");
  const [feedback, setFeedback] = useState<"copied" | "failed" | "">("");
  const shareText = `${t("shareText")} ${referralLink}`;
  const encodedText = encodeURIComponent(shareText);
  const encodedLink = encodeURIComponent(referralLink);

  const copyLink = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(referralLink);
      } else {
        const input = document.createElement("textarea");
        input.value = referralLink;
        input.style.position = "fixed";
        input.style.opacity = "0";
        document.body.appendChild(input);
        input.select();
        const copied = document.execCommand("copy");
        input.remove();
        if (!copied) throw new Error("copy failed");
      }
      setFeedback("copied");
    } catch {
      setFeedback("failed");
    }
  };

  const nativeShare = async () => {
    if (!navigator.share) {
      await copyLink();
      return;
    }
    try {
      await navigator.share({ text: t("shareText"), url: referralLink });
    } catch {
      // L'annulation du sélecteur natif ne doit pas être signalée comme erreur.
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 pb-4">
      <section className="glass-card overflow-hidden rounded-2xl p-5 sm:p-7">
        <p className="marketing-eyebrow w-fit">Bêta Kalivoa</p>
        <h1 className="mt-4 text-2xl font-semibold tracking-[-0.03em] sm:text-3xl">{t(paused ? "pausedTitle" : "title")}</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">{t(paused ? "pausedDescription" : "description")}</p>
        {!paused && (
          <ul className="mt-5 grid gap-2 text-sm sm:grid-cols-2">
            {(["first", "second", "cumulative", "lifetime"] as const).map((benefit) => (
              <li key={benefit} className="rounded-xl border border-border bg-muted/35 px-3 py-2.5 font-medium">
                {t(`benefits.${benefit}`)}
              </li>
            ))}
          </ul>
        )}
      </section>

      {!paused && <section className="glass-card rounded-2xl p-4 sm:p-5">
        <label htmlFor="referral-link" className="text-sm font-semibold">{t("linkLabel")}</label>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <input id="referral-link" readOnly value={referralLink} onFocus={(event) => event.currentTarget.select()} className="min-h-touch min-w-0 flex-1 rounded-xl border border-border bg-background px-3 text-xs text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring" />
          <Button onClick={copyLink} className="min-h-touch rounded-xl px-4 text-sm font-semibold">{t("copy")}</Button>
        </div>
        {feedback && <p role={feedback === "failed" ? "alert" : "status"} className={`mt-2 text-xs ${feedback === "failed" ? "text-loss" : "text-profit"}`}>{feedback === "copied" ? t("copied") : t("copyFailed")}</p>}
        <div className="mt-3 flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={nativeShare} className="min-h-touch rounded-xl">{t("shareNative")}</Button>
          <Button variant="outline" size="sm" onClick={copyLink} className="min-h-touch rounded-xl">{t("shareDiscord")}</Button>
          <a href={`https://wa.me/?text=${encodedText}`} target="_blank" rel="noreferrer" className="inline-flex min-h-touch items-center rounded-xl border border-border px-3 text-xs font-medium hover:bg-muted">WhatsApp</a>
          <a href={`https://t.me/share/url?url=${encodedLink}&text=${encodeURIComponent(t("shareText"))}`} target="_blank" rel="noreferrer" className="inline-flex min-h-touch items-center rounded-xl border border-border px-3 text-xs font-medium hover:bg-muted">Telegram</a>
          <a href={`https://x.com/intent/post?text=${encodedText}`} target="_blank" rel="noreferrer" className="inline-flex min-h-touch items-center rounded-xl border border-border px-3 text-xs font-medium hover:bg-muted">X</a>
          <a href={`https://www.reddit.com/submit?url=${encodedLink}&title=${encodeURIComponent(t("shareText"))}`} target="_blank" rel="noreferrer" className="inline-flex min-h-touch items-center rounded-xl border border-border px-3 text-xs font-medium hover:bg-muted">Reddit</a>
        </div>
      </section>}

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label={t("stats.invited")} value={invitedCount} />
        <Stat label={t("stats.active")} value={activeCount} />
        <Stat label={t("stats.earned")} value={scansEarned} />
        <Stat label={t("stats.balance")} value={referralCreditsRemaining} />
      </section>

      <section className="glass-card overflow-hidden rounded-2xl">
        <div className="border-b border-border px-4 py-4 sm:px-5">
          <h2 className="text-base font-semibold">{t("progressTitle")}</h2>
          <p className="mt-1 text-xs text-muted-foreground">{t("privacy")}</p>
        </div>
        {referrals.length === 0 ? (
          <p className="p-5 text-sm text-muted-foreground">{t("empty")}</p>
        ) : (
          <ul className="divide-y divide-border">
            {referrals.map((referral) => (
              <li key={referral.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                <div>
                  <p className="text-sm font-semibold">{referral.referredEmail}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{t(`status.${referral.status}`)}</p>
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-xs font-semibold text-primary">{t("unlocked", { count: referral.referrerScansUnlocked })}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {referral.status === "COMPLETE"
                      ? t("complete")
                      : referral.status === "REGISTERED"
                        ? t("pendingFirst")
                        : t("pendingSecond", { count: referral.scansUntilNextReward })}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="glass-card rounded-xl p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="num mt-1 text-2xl font-semibold tracking-tight">{value}</p>
    </div>
  );
}
