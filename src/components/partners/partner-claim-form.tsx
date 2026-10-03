"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle, Clock, PaperPlaneTilt } from "@phosphor-icons/react";
import { declarePartnerReferral } from "@/lib/actions/partner-referrals";
import { Link, useRouter } from "@/i18n/navigation";
import type { MemberPartnerClaim } from "@/lib/partners/claims-types";

export function PartnerClaimForm({ partnerId, quantity, claim }: { partnerId: string; quantity: number; claim?: MemberPartnerClaim }) {
  const t = useTranslations("partnerReferrals");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const status = submitted ? "PENDING" : claim?.status;
  const fieldClass = "mt-1 min-h-11 w-full rounded-lg border border-border bg-background px-3 text-sm focus-visible:outline-2 focus-visible:outline-ring";

  return <div className="mt-4 border-t border-border pt-4">
    {status && <div role="status" className="rounded-xl border border-border bg-background/40 p-3">
      <p className="flex items-center gap-2 text-sm font-semibold">{status === "APPROVED" ? <CheckCircle size={18} className="shrink-0 text-profit" aria-hidden /> : <Clock size={18} className="shrink-0 text-primary" aria-hidden />}{t(`statuses.${status}`)}</p>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">{t(`descriptions.${status}`, { count: quantity })}</p>
      {claim?.reviewMessage && !submitted && <p className="mt-2 whitespace-pre-wrap break-words text-xs leading-5">{claim.reviewMessage}</p>}
      {status === "APPROVED" && <Link href="/account/subscription" className="mt-2 inline-flex min-h-11 items-center text-xs font-semibold text-primary">{t("myScans")}</Link>}
    </div>}
    {(!status || status === "NEEDS_INFO") && <details className="mt-1" open={status === "NEEDS_INFO" ? true : undefined}>
      <summary className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg px-2 text-sm font-semibold text-primary focus-visible:outline-2 focus-visible:outline-ring"><PaperPlaneTilt size={17} aria-hidden />{t(status === "NEEDS_INFO" ? "complete" : "declare")}</summary>
      <form className="mt-3 space-y-3" action={(form) => {
        setError("");
        startTransition(async () => {
          try {
            const result = await declarePartnerReferral(form);
            if (!result.ok) { setError(t(`errors.${result.error}`)); return; }
            setSubmitted(true);
            router.refresh();
          } catch { setError(t("errors.actionFailed")); }
        });
      }}>
        <input type="hidden" name="partnerId" value={partnerId} />
        {claim && <><input type="hidden" name="claimId" value={claim.id} /><input type="hidden" name="revision" value={claim.revision} /></>}
        <p className="text-xs leading-5 text-muted-foreground">{t("formHelp")}</p>
        <label className="block text-xs font-medium">{t("username")}<input name="bookmakerUsername" required minLength={2} maxLength={80} defaultValue={claim?.bookmakerUsername} autoComplete="off" className={fieldClass} /></label>
        <label className="block text-xs font-medium">{t("registrationDate")}<input type="date" name="registrationDate" required defaultValue={claim?.registrationDate} className={fieldClass} /></label>
        <label className="block text-xs font-medium">{t("memberNote")}<textarea name="memberNote" maxLength={500} rows={2} defaultValue={claim?.memberNote ?? ""} className={`${fieldClass} py-2`} /></label>
        <label className="flex min-h-11 cursor-pointer items-start gap-2 text-xs leading-5"><input type="checkbox" name="confirmed" required className="mt-1 size-4 shrink-0 accent-primary" /><span>{t("confirmation")}</span></label>
        {error && <p role="alert" className="text-xs leading-5 text-loss">{error}</p>}
        <button type="submit" disabled={pending} className="min-h-11 w-full rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground disabled:opacity-60">{t(pending ? "sending" : status === "NEEDS_INFO" ? "sendUpdate" : "submit")}</button>
      </form>
    </details>}
  </div>;
}
