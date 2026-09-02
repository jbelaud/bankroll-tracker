import { NextResponse, type NextRequest } from "next/server";
import { randomUUID } from "crypto";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { correctionSummary, extensionForMime, MAX_QUALITY_REPORTS_PER_WEEK, QUALITY_ALLOWED_MEDIA, QUALITY_BUCKET, QUALITY_RETENTION_DAYS, SCAN_PROMPT_VERSION } from "@/lib/scan/quality";
import type { ParsedBet } from "@/lib/scan/types";
import { hasExplicitQualityConsent } from "@/lib/scan/quality-guard";
import { normalizeBookmakerDetection } from "@/lib/scan/response";
import { parseQualityIssueType } from "@/lib/scan/quality";
import { sendQualityReportToDiscord } from "@/lib/scan/discord-quality";

export const runtime = "nodejs";
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

function isSameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  try { return !!origin && !!host && new URL(origin).host === host; } catch { return false; }
}

function parseJson(value: FormDataEntryValue | null): unknown {
  if (typeof value !== "string" || value.length > 200_000) throw new Error("Données de scan invalides.");
  return JSON.parse(value);
}

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Origine non autorisée." }, { status: 403 });
  let user;
  try { user = await requireUser(); } catch { return NextResponse.json({ error: "Non authentifié." }, { status: 401 }); }

  const form = await request.formData();
  const consent = hasExplicitQualityConsent(form.get("consent"));
  const issueType = parseQualityIssueType(form.get("issueType"));
  const issueDetailsValue = form.get("issueDetails");
  const issueDetails = typeof issueDetailsValue === "string" ? issueDetailsValue.trim().slice(0, 1_000) || null : null;
  const image = form.get("image");
  if (!consent) return NextResponse.json({ error: "Le consentement explicite est requis." }, { status: 400 });
  if (!issueType) return NextResponse.json({ error: "Type de problème invalide." }, { status: 400 });
  if (!(image instanceof File) || !QUALITY_ALLOWED_MEDIA.includes(image.type as (typeof QUALITY_ALLOWED_MEDIA)[number]) || image.size === 0 || image.size > MAX_IMAGE_BYTES) {
    return NextResponse.json({ error: "Image invalide ou trop volumineuse." }, { status: 415 });
  }

  let rawExtraction: unknown;
  let finalExtraction: ParsedBet[];
  try {
    rawExtraction = parseJson(form.get("rawExtraction"));
    const parsedFinal = parseJson(form.get("finalExtraction"));
    if (!Array.isArray(parsedFinal)) throw new Error();
    finalExtraction = (parsedFinal as ParsedBet[]).map((bet) => {
      const cleaned = { ...bet };
      delete cleaned.sourceScanIndex;
      return cleaned;
    });
  } catch { return NextResponse.json({ error: "Données de revue invalides." }, { status: 400 }); }

  const bankrollId = String(form.get("bankrollId") ?? "");
  const bankroll = await prisma.bankroll.findFirst({ where: { id: bankrollId, userId: user.id }, select: { id: true, bookmaker: true } });
  if (!bankroll) return NextResponse.json({ error: "Bankroll introuvable." }, { status: 404 });
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  if (await prisma.scanQualityReport.count({ where: { userId: user.id, createdAt: { gte: since } } }) >= MAX_QUALITY_REPORTS_PER_WEEK) {
    return NextResponse.json({ error: "Limite hebdomadaire de partages atteinte." }, { status: 429 });
  }

  const id = randomUUID();
  const detection = normalizeBookmakerDetection(
    form.get("detectedBookmaker"),
    Number(form.get("detectionConfidence"))
  );
  const storagePath = `${user.id}/${id}.${extensionForMime(image.type)}`;
  const supabase = createAdminSupabaseClient();
  const { error: uploadError } = await supabase.storage.from(QUALITY_BUCKET).upload(storagePath, await image.arrayBuffer(), { contentType: image.type, upsert: false });
  if (uploadError) {
    console.error("[scan-quality] storage upload failed", uploadError.message);
    return NextResponse.json({ error: "Le partage sécurisé est indisponible." }, { status: 503 });
  }

  try {
    const { count, types } = correctionSummary(rawExtraction, finalExtraction);
    const reportBookmaker = bankroll.bookmaker ?? detection.detectedBookmaker ?? "Non renseigné";
    const expiresAt = new Date(Date.now() + QUALITY_RETENTION_DAYS * 24 * 60 * 60 * 1000);
    await prisma.scanQualityReport.create({ data: {
      id, userId: user.id, bankrollId: bankroll.id, bookmaker: reportBookmaker,
      detectedBookmaker: detection.detectedBookmaker, detectionConfidence: detection.detectionConfidence,
      model: String(form.get("model") ?? "unknown").slice(0, 100), promptVersion: SCAN_PROMPT_VERSION,
      issueType, issueDetails,
      rawExtraction: rawExtraction as object, finalExtraction: finalExtraction as object,
      correctionCount: count, correctionTypes: types, storagePath, consentedAt: new Date(), expiresAt,
    } });
  } catch (error) {
    await supabase.storage.from(QUALITY_BUCKET).remove([storagePath]);
    console.error("[scan-quality] report creation failed", error);
    return NextResponse.json({ error: "Le partage n'a pas pu être enregistré." }, { status: 500 });
  }
  const discord = await sendQualityReportToDiscord({
    reportId: id, bookmaker: bankroll.bookmaker ?? detection.detectedBookmaker ?? "Non renseigné", issueType, issueDetails, image,
  });
  return NextResponse.json({ ok: true, discordSent: discord.sent }, { status: 201 });
}
