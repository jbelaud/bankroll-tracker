"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { decidePartnerReferral, resendPartnerReferralEmail } from "@/lib/actions/partner-referrals";
import { useRouter } from "@/i18n/navigation";
import type { AdminPartnerClaim, ClaimActionResult } from "@/lib/partners/claims-types";

export function PartnerReferralManager({ claims, locale }: { claims: AdminPartnerClaim[]; locale: string }) {
  const t = useTranslations("partnerReferrals.admin");
  if (!claims.length) return <p className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">{t("empty")}</p>;
  return <ul className="space-y-4">{claims.map((claim) => <ClaimReview key={`${claim.id}-${claim.revision}`} claim={claim} locale={locale} />)}</ul>;
}

function ClaimReview({ claim, locale }: { claim: AdminPartnerClaim; locale: string }) {
  const t = useTranslations("partnerReferrals");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const dateFormat = new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" });
  const act = (action: () => Promise<ClaimActionResult>) => {
    setError(""); setSuccess("");
    startTransition(async () => {
      try {
        const result = await action();
        if (!result.ok) { setError(t(`errors.${result.error}`)); return; }
        setSuccess(t("admin.saved"));
        router.refresh();
      } catch { setError(t("errors.actionFailed")); }
    });
  };
  return <li className="min-w-0 rounded-2xl border border-border bg-card p-4 sm:p-5">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0"><h2 className="text-base font-semibold">{claim.partnerName}</h2><p className="mt-1 break-all text-sm">{claim.memberEmail}</p>{claim.memberName && <p className="text-xs text-muted-foreground">{claim.memberName}</p>}</div>
      <span className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary">{t(`statuses.${claim.status}`)}</span>
    </div>
    <dl className="mt-4 grid gap-3 rounded-xl border border-border bg-background/40 p-3 text-xs sm:grid-cols-3">
      <div><dt className="text-muted-foreground">{t("username")}</dt><dd className="mt-1 break-words font-semibold">{claim.bookmakerUsername}</dd></div>
      <div><dt className="text-muted-foreground">{t("registrationDate")}</dt><dd className="mt-1 font-semibold">{new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "Europe/Paris" }).format(new Date(`${claim.registrationDate}T00:00:00Z`))}</dd></div>
      <div><dt className="text-muted-foreground">{t("admin.declaredAt")}</dt><dd className="mt-1 font-semibold">{dateFormat.format(new Date(claim.createdAt))}</dd></div>
    </dl>
    {claim.memberNote && <p className="mt-3 whitespace-pre-wrap break-words text-sm"><span className="text-muted-foreground">{t("admin.memberMessage")} </span>{claim.memberNote}</p>}
    {claim.reviewMessage && <p className="mt-3 whitespace-pre-wrap break-words text-sm"><span className="text-muted-foreground">{t("admin.reviewMessage")} </span>{claim.reviewMessage}</p>}
    {claim.status === "PENDING" && <form className="mt-4 space-y-3" action={(form) => act(() => decidePartnerReferral(form))}>
      <input type="hidden" name="claimId" value={claim.id} /><input type="hidden" name="revision" value={claim.revision} />
      <label className="block text-xs font-medium">{t("admin.messageLabel")}<textarea name="reviewMessage" maxLength={1000} rows={2} className="mt-1 w-full rounded-lg border border-border bg-background p-3 text-sm focus-visible:outline-2 focus-visible:outline-ring" /></label>
      <p className="text-xs leading-5 text-muted-foreground">{t("admin.validationHelp")}</p>
      <div className="flex flex-wrap gap-2">
        <button type="submit" name="decision" value="APPROVED" disabled={pending} className="min-h-11 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-60">{t("admin.approve", { count: claim.rewardQuantity })}</button>
        <button type="submit" name="decision" value="NEEDS_INFO" disabled={pending} className="min-h-11 rounded-lg border border-border px-4 text-sm font-medium disabled:opacity-60">{t("admin.needInfo")}</button>
        <button type="submit" name="decision" value="REJECTED" disabled={pending} className="min-h-11 rounded-lg border border-loss/30 px-4 text-sm font-medium text-loss disabled:opacity-60">{t("admin.reject")}</button>
      </div>
    </form>}
    {claim.status === "APPROVED" && <div className="mt-4 rounded-xl border border-profit/25 bg-profit/5 p-3">
      <p className="text-sm font-semibold">{t("admin.rewardGranted", { count: claim.rewardQuantity })}</p>
      <p className="mt-1 text-xs text-muted-foreground">{t(`admin.emailStatuses.${claim.emailStatus ?? "PENDING"}`)}</p>
      {claim.emailStatus === "NEEDS_REVIEW" && <p className="mt-2 text-xs leading-5 text-muted-foreground">{t("admin.uncertainEmailHelp")}</p>}
      {claim.emailStatus && claim.emailStatus !== "SENT" && <button type="button" disabled={pending} onClick={() => act(() => resendPartnerReferralEmail(claim.id))} className="mt-2 min-h-11 rounded-lg border border-border px-3 text-xs font-semibold disabled:opacity-60">{t("admin.retryEmail")}</button>}
    </div>}
    {error && <p role="alert" className="mt-3 text-sm text-loss">{error}</p>}
    {success && <p role="status" className="mt-3 text-sm text-profit">{success}</p>}
    <details className="mt-4 border-t border-border pt-1"><summary className="min-h-11 cursor-pointer py-3 text-xs font-semibold focus-visible:outline-2 focus-visible:outline-ring">{t("admin.audit")}</summary>
      <ol className="space-y-2 text-xs text-muted-foreground">{claim.events.map((event) => <li key={event.id}><p>{dateFormat.format(new Date(event.createdAt))} · {t(`statuses.${event.status}`)}</p>{event.message && event.status !== "PENDING" && <p className="mt-1 whitespace-pre-wrap break-words text-foreground">{event.message}</p>}</li>)}</ol>
    </details>
  </li>;
}
