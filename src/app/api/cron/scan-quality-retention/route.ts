import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { QUALITY_BUCKET } from "@/lib/scan/quality";
import { Prisma } from "@prisma/client";
import { recoverAbandonedScanReservations } from "@/lib/scan/credit-wallet";
import { retryPendingReferralRewards } from "@/lib/referral/service";
import { retryPendingPartnerRewardEmails } from "@/lib/partners/reward-emails";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const recoveredScanWallets = await recoverAbandonedScanReservations();
  const retriedReferralRewards = await retryPendingReferralRewards();
  const retriedPartnerEmails = await retryPendingPartnerRewardEmails();
  const reports = await prisma.scanQualityReport.findMany({
    where: { expiresAt: { lte: new Date() } },
    select: { id: true, storagePath: true },
    take: 100,
  });
  const clearedExtensionReceipts = await prisma.scanUsage.updateMany({
    where: { createdAt: { lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }, extensionReceipt: { not: Prisma.DbNull } },
    data: { extensionReceipt: Prisma.DbNull },
  });
  const storage = createAdminSupabaseClient().storage.from(QUALITY_BUCKET);
  let deleted = 0;
  for (const report of reports) {
    const { error } = await storage.remove([report.storagePath]);
    if (error) {
      console.error("[scan-quality-retention] storage delete failed", report.id, error.message);
      continue;
    }
    await prisma.scanQualityReport.delete({ where: { id: report.id } });
    deleted++;
  }
  return NextResponse.json({ deleted, clearedExtensionReceipts: clearedExtensionReceipts.count, recoveredScanWallets, retriedReferralRewards, retriedPartnerEmails });
}
