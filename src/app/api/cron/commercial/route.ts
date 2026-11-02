import { NextResponse, type NextRequest } from "next/server";
import { commercialRecordsEnabled } from "@/lib/billing/commercial-config";
import { queueAnnualReminders } from "@/lib/billing/records";
import { retryWithdrawals } from "@/lib/billing/withdrawals";
import { retryTransactionalEmails } from "@/lib/billing/transactional-emails";
import { stripe } from "@/lib/stripe";
import { purgeTemporaryData, queueInactivityWarnings, purgeInactiveAccounts } from "@/lib/privacy/retention";

export const runtime = "nodejs";
export const maxDuration = 300;
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const purged = await purgeTemporaryData();
  if (!commercialRecordsEnabled() || !stripe) return NextResponse.json({ enabled: false, purged });
  const withdrawals = await retryWithdrawals(stripe);
  const annualNotices = await queueAnnualReminders(stripe);
  const emails = await retryTransactionalEmails();
  const inactivityWarnings = await queueInactivityWarnings();
  const inactiveAccounts = await purgeInactiveAccounts();
  return NextResponse.json({ withdrawals, annualNotices, emails, purged, inactivityWarnings, inactiveAccounts });
}
