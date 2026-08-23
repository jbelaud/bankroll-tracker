import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { redeemBetaInvite } from "@/lib/beta/program";
import { attachStoredReferralToNewUser } from "@/lib/referral/service";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next");
  const invite = searchParams.get("invite");
  // Seules les routes internes sont admises : ne jamais refléter une URL
  // externe fournie en query string après un retour OAuth.
  const safeNext = next?.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      if (data.user && invite) await redeemBetaInvite(invite, data.user);
      if (data.user) await attachStoredReferralToNewUser(data.user.id);
      return NextResponse.redirect(new URL(safeNext, origin));
    }
  }

  const locale = safeNext.match(/^\/(fr|en)(?:\/|$)/)?.[1] ?? "fr";
  return NextResponse.redirect(new URL(`/${locale}/login?error=callback_failed`, origin));
}
