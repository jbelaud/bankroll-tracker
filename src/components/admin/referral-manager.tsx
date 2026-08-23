"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import type { ReferralRewardType } from "@prisma/client";
import { Button } from "@/components/ui/button";
import {
  cancelReferralReward,
  clearReferralReview,
  flagReferralForReview,
} from "@/lib/actions/referrals";

type ReferralReward = {
  id: string;
  amount: number;
  type: ReferralRewardType;
  status: "GRANTED" | "CANCELLED";
  cancellationReason: string | null;
  createdAt: string;
};

const REWARD_TYPE_KEYS = {
  REFEREE_FIRST_VALID_SCAN: "rewardTypes.REFEREE_FIRST_VALID_SCAN",
  REFERRER_FIRST_VALID_SCAN: "rewardTypes.REFERRER_FIRST_VALID_SCAN",
  REFERRER_FIFTH_VALID_SCAN: "rewardTypes.REFERRER_FIFTH_VALID_SCAN",
  REFERRER_SUBSCRIPTION_PAYMENT: "rewardTypes.REFERRER_SUBSCRIPTION_PAYMENT",
} as const;

type Referral = {
  id: string;
  referrerEmail: string;
  referredEmail: string;
  validScanCount: number;
  suspiciousAt: string | null;
  suspiciousReason: string | null;
  createdAt: string;
  rewards: ReferralReward[];
};

export function ReferralManager({ referrals, locale }: { referrals: Referral[]; locale: string }) {
  const t = useTranslations("admin.referrals");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const dateFormat = new Intl.DateTimeFormat(locale, { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

  const reportError = (cause: unknown) => setError(cause instanceof Error ? cause.message : t("actionFailed"));
  const requestReason = (label: string) => window.prompt(label)?.trim() ?? "";

  return (
    <section className="glass-card overflow-hidden rounded-xl">
      <div className="border-b border-border p-4">
        <h2 className="text-sm font-semibold">{t("title")}</h2>
        <p className="mt-1 text-xs text-muted-foreground">{t("description")}</p>
      </div>
      {error && <p role="alert" className="mx-4 mt-3 text-xs text-loss">{error}</p>}
      {referrals.length === 0 ? (
        <p className="p-4 text-sm text-muted-foreground">{t("empty")}</p>
      ) : (
        <ul className="divide-y divide-border">
          {referrals.map((referral) => (
            <li key={referral.id} className="p-4 text-xs">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="font-semibold">{referral.referrerEmail} <span className="text-muted-foreground">→</span> {referral.referredEmail}</p>
                  <p className="mt-1 text-muted-foreground">{t("scanCount", { count: referral.validScanCount })} · {dateFormat.format(new Date(referral.createdAt))}</p>
                  {referral.suspiciousReason && <p className="mt-1 text-warning">{t("flagged", { reason: referral.suspiciousReason })}</p>}
                </div>
                {referral.suspiciousAt ? (
                  <Button size="xs" variant="outline" disabled={pending} onClick={() => startTransition(async () => { try { await clearReferralReview(referral.id); } catch (cause) { reportError(cause); } })}>{t("clearFlag")}</Button>
                ) : (
                  <Button size="xs" variant="outline" disabled={pending} onClick={() => {
                    const reason = requestReason(t("flagPrompt"));
                    if (!reason) return;
                    startTransition(async () => { try { await flagReferralForReview(referral.id, reason); } catch (cause) { reportError(cause); } });
                  }}>{t("flag")}</Button>
                )}
              </div>
              <ul className="mt-3 divide-y divide-border rounded-lg border border-border">
                {referral.rewards.length === 0 ? <li className="p-2 text-muted-foreground">{t("noRewards")}</li> : referral.rewards.map((reward) => (
                  <li key={reward.id} className="flex flex-wrap items-center justify-between gap-2 p-2">
                    <span><strong>+{reward.amount}</strong> · {t(REWARD_TYPE_KEYS[reward.type])} · {t(`rewardStatus.${reward.status}`)}</span>
                    {reward.status === "GRANTED" && <Button size="xs" variant="destructive" disabled={pending} onClick={() => {
                      const reason = requestReason(t("cancelPrompt"));
                      if (!reason) return;
                      startTransition(async () => { try { await cancelReferralReward(reward.id, reason); } catch (cause) { reportError(cause); } });
                    }}>{t("cancel")}</Button>}
                    {reward.cancellationReason && <span className="w-full text-muted-foreground">{t("cancelReason", { reason: reward.cancellationReason })}</span>}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
