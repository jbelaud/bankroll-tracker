"use server";

import { getLocale } from "next-intl/server";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { requireAdmin } from "@/lib/admin";
import { parseClaimSubmission, parseClaimReview, ClaimError } from "@/lib/partners/claim-validation";
import { submitPartnerClaim, reviewPartnerClaim } from "@/lib/partners/claims";
import { deliverPartnerRewardEmail, retryPartnerRewardEmail } from "@/lib/partners/reward-emails";
import type { ClaimActionResult } from "@/lib/partners/claims-types";

function refreshPartnerViews() {
  for (const path of ["partners", "admin", "admin/partners", "dashboard", "account/subscription"]) revalidatePath(`/[locale]/${path}`, "page");
}

function failure(error: unknown): ClaimActionResult {
  if (error instanceof ClaimError) return { ok: false, error: error.code };
  console.error("[partner-referrals] action failed", error instanceof Error ? error.name : "UnknownError");
  return { ok: false, error: "actionFailed" };
}

export async function declarePartnerReferral(form: FormData): Promise<ClaimActionResult> {
  const user = await requireUser();
  if (user.is_anonymous || !user.email) return { ok: false, error: "actionFailed" };
  try {
    const locale = await getLocale();
    await submitPartnerClaim(user.id, locale === "en" ? "en" : "fr", parseClaimSubmission(form));
    refreshPartnerViews();
    return { ok: true };
  } catch (error) { return failure(error); }
}

export async function decidePartnerReferral(form: FormData): Promise<ClaimActionResult> {
  const admin = await requireAdmin();
  try {
    const input = parseClaimReview(form);
    const claim = await reviewPartnerClaim(admin.id, input);
    if (claim.status === "APPROVED") {
      // La validation reste acquise même si le prestataire d'email est indisponible.
      try { await deliverPartnerRewardEmail(claim.id); } catch { console.error("[partner-referrals] email queued for retry"); }
    }
    refreshPartnerViews();
    return { ok: true };
  } catch (error) { return failure(error); }
}

export async function resendPartnerReferralEmail(claimId: string): Promise<ClaimActionResult> {
  await requireAdmin();
  if (typeof claimId !== "string" || !claimId.trim() || claimId.length > 100) return { ok: false, error: "invalidForm" };
  try {
    await retryPartnerRewardEmail(claimId);
    refreshPartnerViews();
    return { ok: true };
  } catch (error) { return failure(error); }
}
