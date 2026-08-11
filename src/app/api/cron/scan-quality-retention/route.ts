import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { QUALITY_BUCKET } from "@/lib/scan/quality";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const reports = await prisma.scanQualityReport.findMany({
    where: { expiresAt: { lte: new Date() } },
    select: { id: true, storagePath: true },
    take: 100,
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
  return NextResponse.json({ deleted });
}
