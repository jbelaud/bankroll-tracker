import { headers } from "next/headers";
import type { Locale } from "@/i18n/routing";
import { requireUser } from "@/lib/auth";
import { getReferralOverview } from "@/lib/referral/overview";
import { ReferralDashboard } from "@/components/referral/referral-dashboard";

async function appOrigin(): Promise<string> {
  if (process.env.NEXT_PUBLIC_APP_URL) return new URL(process.env.NEXT_PUBLIC_APP_URL).origin;
  const requestHeaders = await headers();
  const host = requestHeaders.get("host");
  if (!host) throw new Error("Hôte de l'application introuvable.");
  return `${requestHeaders.get("x-forwarded-proto") ?? "http"}://${host}`;
}

export default async function ReferralsPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const [{ locale }, user] = await Promise.all([params, requireUser()]);
  const [overview, origin] = await Promise.all([getReferralOverview(user.id), appOrigin()]);
  const link = new URL(`/${locale}/signup`, origin);
  link.searchParams.set("ref", overview.referralCode);

  return <ReferralDashboard referralLink={link.toString()} {...overview} />;
}
