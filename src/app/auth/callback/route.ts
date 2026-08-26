import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { redeemBetaInvite } from "@/lib/beta/program";
import { attachStoredReferralToNewUser } from "@/lib/referral/service";
import { recordGrowthEventSafely } from "@/lib/growth/events";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next");
  const invite = searchParams.get("invite");
  const growthAnonymousId = searchParams.get("growthAnonymousId");
  const acquisitionSource = searchParams.get("acquisitionSource");
  const utmSource = searchParams.get("utmSource");
  const utmMedium = searchParams.get("utmMedium");
  const utmCampaign = searchParams.get("utmCampaign");
  // Seules les routes internes sont admises : ne jamais refléter une URL
  // externe fournie en query string après un retour OAuth.
  const safeNext = next?.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      if (data.user && invite) await redeemBetaInvite(invite, data.user);
      if (data.user) {
        await attachStoredReferralToNewUser(data.user.id);
        await recordGrowthEventSafely({
          name: "signup_completed",
          userId: data.user.id,
          anonymousId: growthAnonymousId,
          properties: {
            acquisition_source: acquisitionSource || "direct",
            utm_source: utmSource,
            utm_medium: utmMedium,
            utm_campaign: utmCampaign,
          },
        });
      }
      return NextResponse.redirect(new URL(safeNext, origin));
    }
  }

  const locale = safeNext.match(/^\/(fr|en)(?:\/|$)/)?.[1] ?? "fr";
  return NextResponse.redirect(new URL(`/${locale}/login?error=callback_failed`, origin));
}
