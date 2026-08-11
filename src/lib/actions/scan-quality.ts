"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { QUALITY_BUCKET } from "@/lib/scan/quality";
import type { ScanQualityReportStatus } from "@prisma/client";
import { Prisma } from "@prisma/client";

async function removeReport(report: { id: string; storagePath: string }) {
  await createAdminSupabaseClient().storage.from(QUALITY_BUCKET).remove([report.storagePath]);
  await prisma.scanQualityReport.delete({ where: { id: report.id } });
}

export async function deleteOwnScanQualityReport(id: string) {
  const user = await requireUser();
  const report = await prisma.scanQualityReport.findFirst({ where: { id, userId: user.id }, select: { id: true, storagePath: true } });
  if (!report) throw new Error("Rapport introuvable.");
  await removeReport(report);
  revalidatePath("/[locale]/account", "page");
}

export async function updateScanQualityReport(id: string, status: ScanQualityReportStatus, note?: string) {
  await requireAdmin();
  await prisma.scanQualityReport.update({
    where: { id },
    data: { status, adminNotes: note?.slice(0, 2_000), reviewedAt: new Date() },
  });
  revalidatePath("/[locale]/admin", "page");
}

export async function setBookmakerSupport(bookmaker: string, supportStatus: "TESTED" | "UNTESTED" | "VALIDATING") {
  await requireAdmin();
  await prisma.bookmakerScanProfile.upsert({
    where: { bookmaker },
    update: { supportStatus },
    create: { bookmaker, supportStatus },
  });
  revalidatePath("/[locale]/admin", "page");
}

export async function saveBookmakerScanProfile(bookmaker: string, rules: string, examplesText: string) {
  await requireAdmin();
  const normalizedBookmaker = bookmaker.trim().replace(/\s+/g, " ");
  const normalizedRules = rules.trim();
  if (!normalizedBookmaker || normalizedBookmaker.length > 100 || normalizedRules.length > 20_000) {
    throw new Error("Profil bookmaker invalide.");
  }

  let examples: Prisma.InputJsonValue | typeof Prisma.JsonNull = Prisma.JsonNull;
  if (examplesText.trim()) {
    try {
      const parsed: unknown = JSON.parse(examplesText);
      if (!Array.isArray(parsed) && (typeof parsed !== "object" || parsed === null)) throw new Error();
      examples = parsed as Prisma.InputJsonValue;
    } catch {
      throw new Error("Les exemples doivent être un JSON valide (tableau ou objet).");
    }
  }

  await prisma.bookmakerScanProfile.upsert({
    where: { bookmaker: normalizedBookmaker },
    update: { rules: normalizedRules || null, examples, version: { increment: 1 } },
    create: { bookmaker: normalizedBookmaker, rules: normalizedRules || null, examples },
  });
  revalidatePath("/[locale]/admin", "page");
}

export async function deleteScanQualityReportAsAdmin(id: string) {
  await requireAdmin();
  const report = await prisma.scanQualityReport.findUnique({ where: { id }, select: { id: true, storagePath: true } });
  if (!report) throw new Error("Rapport introuvable.");
  await removeReport(report);
  revalidatePath("/[locale]/admin", "page");
}
