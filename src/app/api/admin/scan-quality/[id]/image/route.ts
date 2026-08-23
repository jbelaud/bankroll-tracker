import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { QUALITY_BUCKET } from "@/lib/scan/quality";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SIGNED_URL_SECONDS = 60;
type ImageRouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: ImageRouteContext) {
  await requireAdmin();
  const { id } = await context.params;
  const report = await prisma.scanQualityReport.findUnique({
    where: { id },
    select: { storagePath: true, expiresAt: true },
  });

  if (!report) return NextResponse.json({ error: "Capture introuvable." }, { status: 404 });
  if (report.expiresAt <= new Date()) return NextResponse.json({ error: "La période de conservation de cette capture est terminée." }, { status: 410 });

  const { data, error } = await createAdminSupabaseClient()
    .storage
    .from(QUALITY_BUCKET)
    .createSignedUrl(report.storagePath, SIGNED_URL_SECONDS);
  if (error || !data?.signedUrl) {
    console.error("[admin/scan-quality/image] signed URL creation failed", error?.message);
    return NextResponse.json({ error: "La capture sécurisée est momentanément indisponible." }, { status: 503 });
  }

  const response = NextResponse.redirect(data.signedUrl, { status: 307 });
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}
