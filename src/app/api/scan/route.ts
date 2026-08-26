import { NextResponse, type NextRequest } from "next/server";
import { createHash } from "crypto";
import { Prisma } from "@prisma/client";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { labelToBetResult } from "@/lib/bet-result";
import { hasKnownTicketReference, looksLikeParsedDuplicate } from "@/lib/scan/duplicate";
import { checkScanRateLimit } from "@/lib/scan/rate-limit";
import { checkMonthlyQuota, releaseMonthlyQuota } from "@/lib/scan/monthly-quota";
import { getServerLocale as getLocale } from "@/lib/i18n/get-server-locale";
import { calculateScanCostUsd } from "@/lib/scan/cost";
import { getUserTaxonomy, normalizeTaxonomyPair } from "@/lib/taxonomy";
import {
  analyzeTicketImage,
  hasConfiguredScanProvider,
  type ScanMediaType,
} from "@/lib/scan/ai-provider";
import type { ParsedBet } from "@/lib/scan/types";
import { SCAN_PROMPT_VERSION } from "@/lib/scan/quality";
import { bookmakerKind, normalizeBookmaker } from "@/lib/bookmakers";
import { parseScanAnalysis } from "@/lib/scan/response";
import { rulesForTestedProfile } from "@/lib/scan/bookmaker-profile";
import { isBankrollLockedForUser } from "@/lib/billing/bankroll-access";
import { processValidReferralScan } from "@/lib/referral/service";
import { hasValidReferralScan } from "@/lib/referral/valid-scan";
import { recordGrowthEventSafely } from "@/lib/growth/events";

// Contrairement aux Server Actions (protégées nativement par Next contre le
// CSRF via vérification d'Origin), les Route Handlers ne le sont pas —
// cette route accepte un POST multipart déclenchant un appel payant, donc
// on vérifie explicitement que la requête vient bien de cette même origine.
function isSameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (!origin || !host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

// La clé API Claude ne quitte jamais le serveur → runtime Node, jamais edge.
export const runtime = "nodejs";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // garde-fou 8 Mo
const ALLOWED_MEDIA = ["image/png", "image/jpeg", "image/gif", "image/webp"] as const;
type Media = (typeof ALLOWED_MEDIA)[number];

function numOrNull(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function isoDateOrNull(value: unknown): string | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value ? null : value;
}

export async function POST(request: NextRequest) {
  const scanStartedAt = Date.now();
  const locale = await getLocale();
  const t = await getTranslations({ locale, namespace: "scanApi" });

  // 1. Sécurité : origine same-site, puis utilisateur connecté.
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: t("forbiddenOrigin") }, { status: 403 });
  }

  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: t("notAuthenticated") }, { status: 401 });
  }

  // 2. Rate limit : chaque appel coûte réellement de l'argent (API Claude).
  // 2bis. Quota mensuel lié au plan — distinct du
  // rate-limit horaire ci-dessus, qui protège contre l'abus indépendamment
  // du plan.
  if (!hasConfiguredScanProvider()) {
    return NextResponse.json({ error: t("apiKeyMissing") }, { status: 503 });
  }

  // 3. Récupération de l'image (une par requête — le client boucle pour la progression).
  const formData = await request.formData();
  const image = formData.get("image");
  const bankrollId = String(formData.get("bankrollId") ?? "");
  if (!(image instanceof File)) {
    return NextResponse.json({ error: t("missingImage") }, { status: 400 });
  }
  if (!ALLOWED_MEDIA.includes(image.type as Media)) {
    return NextResponse.json({ error: t("unsupportedImage") }, { status: 415 });
  }
  const mediaType = image.type as ScanMediaType;
  const bytes = await image.arrayBuffer();
  if (bytes.byteLength === 0) {
    return NextResponse.json({ error: t("emptyImage") }, { status: 400 });
  }
  if (bytes.byteLength > MAX_IMAGE_BYTES) {
    return NextResponse.json({ error: t("imageTooLarge") }, { status: 413 });
  }
  const base64 = Buffer.from(bytes).toString("base64");
  // Une même capture ne peut pas être rejouée pour faire progresser un
  // parrainage. Le hash ne quitte jamais le serveur et ne conserve pas l'image.
  const sourceHash = createHash("sha256").update(Buffer.from(bytes)).digest("hex");

  const [dbUser, taxonomy, bankroll] = await Promise.all([
    prisma.user.findUniqueOrThrow({
    where: { id: user.id },
    select: { plan: true },
    }),
    getUserTaxonomy(user.id),
    prisma.bankroll.findFirst({
      where: { id: bankrollId, userId: user.id },
      select: { bookmaker: true },
    }),
  ]);
  if (!bankroll) return NextResponse.json({ error: "Bankroll introuvable." }, { status: 404 });
  const normalizedBookmaker = normalizeBookmaker(bankroll.bookmaker);
  if (await isBankrollLockedForUser(user.id, bankrollId)) {
    return NextResponse.json({ error: t("bankrollLocked") }, { status: 403 });
  }
  const profile = await prisma.bookmakerScanProfile.findUnique({
    where: { bookmaker: normalizedBookmaker },
    select: { supportStatus: true, rules: true },
  });
  const supportStatus = profile?.supportStatus ?? (bookmakerKind(normalizedBookmaker) === "tested" ? "TESTED" : "UNTESTED");

  const duplicateScan = await prisma.scanUsage.findUnique({
    where: { userId_sourceHash: { userId: user.id, sourceHash } },
    select: { id: true, betsImported: true },
  });
  // Une analyse ne devient un doublon bloquant que lorsque ses paris ont
  // réellement été importés. Un brouillon peut être repris ; une ancienne
  // analyse sans import ni brouillon est libérée pour que l'utilisateur puisse
  // l'analyser de nouveau, sans créer une seconde récompense de parrainage.
  let isRescanAfterUnimportedAnalysis = false;
  if (duplicateScan) {
    if (duplicateScan.betsImported > 0) {
      return NextResponse.json(
        { error: t("duplicateScanImported", { count: duplicateScan.betsImported }) },
        { status: 409 }
      );
    }

    const drafts = await prisma.scanDraft.findMany({
      where: { userId: user.id },
      select: { payload: true },
      take: 20,
    });
    const hasPendingDraft = drafts.some(({ payload }) => {
      const scans = (payload as { scans?: unknown }).scans;
      return Array.isArray(scans) && scans.some(
        (scan) => typeof scan === "object" && scan !== null && (scan as { usageId?: unknown }).usageId === duplicateScan.id
      );
    });
    if (hasPendingDraft) {
      return NextResponse.json({ error: t("duplicateScanPending") }, { status: 409 });
    }

    // On garde la ligne de coût historique, mais son hash est libéré : aucun
    // import n'a eu lieu et l'utilisateur n'a plus de brouillon à reprendre.
    await prisma.scanUsage.update({
      where: { id: duplicateScan.id },
      data: { sourceHash: null },
    });
    isRescanAfterUnimportedAnalysis = true;
  }

  const rateLimit = await checkScanRateLimit(user.id, dbUser.plan);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        error: t("tooManyScans", {
          minutes: Math.max(1, Math.ceil(rateLimit.retryAfterSeconds / 60)),
        }),
      },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } }
    );
  }
  const monthlyQuota = await checkMonthlyQuota(user.id, dbUser.plan);
  if (!monthlyQuota.allowed) {
    return NextResponse.json(
      { error: t("monthlyQuotaExceeded") },
      { status: 429, headers: { "Retry-After": String(monthlyQuota.retryAfterSeconds) } }
    );
  }
  let quotaReserved = true;
  const releaseQuota = async () => {
    if (!quotaReserved) return;
    quotaReserved = false;
    await releaseMonthlyQuota(user.id, monthlyQuota.reservation);
  };

  // 4. Appel IA côté serveur uniquement (Gemini prioritaire, Anthropic en repli).
  let rawBets: unknown[];
  let rawExtraction: unknown;
  let detectedBookmaker: string | null = null;
  let detectionConfidence: number | null = null;
  let scanModel = "unknown";
  let scanInputTokens = 0;
  let scanOutputTokens = 0;
  try {
    const response = await analyzeTicketImage({
      base64,
      mediaType,
      taxonomy,
      bookmaker: normalizedBookmaker,
      bookmakerRules: rulesForTestedProfile(profile),
    });
    scanModel = response.model;
    scanInputTokens = response.inputTokens;
    scanOutputTokens = response.outputTokens;
    const analysis = parseScanAnalysis(response.text);
    rawBets = analysis.bets;
    rawExtraction = analysis;
    detectedBookmaker = analysis.detectedBookmaker;
    detectionConfidence = analysis.detectionConfidence;

  } catch (e) {
    await releaseQuota();
    await prisma.scanUsage.create({
      data: {
        userId: user.id,
        model: scanModel,
        plan: dbUser.plan,
        inputTokens: scanInputTokens,
        outputTokens: scanOutputTokens,
        costUsd: calculateScanCostUsd(scanModel, scanInputTokens, scanOutputTokens),
        outcome: "TECHNICAL_FAILURE",
        selectedBookmaker: normalizedBookmaker,
        promptVersion: SCAN_PROMPT_VERSION,
        durationMs: Date.now() - scanStartedAt,
      },
    }).catch((telemetryError) => console.error("[scan] échec télémétrie technique", telemetryError));
    await recordGrowthEventSafely({
      name: "scan_failed",
      userId: user.id,
      properties: { bookmaker: normalizedBookmaker, scan_duration_ms: Date.now() - scanStartedAt },
    });
    console.error("[scan] extraction échouée", e);
    return NextResponse.json({ error: t("analysisFailed") }, { status: 502 });
  }

  if (rawBets.length === 0) {
    // Conserve la télémétrie de l'analyse (comme avant le parrainage), mais
    // marque explicitement ce scan vide comme non éligible à toute récompense.
    let emptyScanUsage: { id: string };
    try {
      emptyScanUsage = await prisma.scanUsage.create({
        data: {
          userId: user.id,
          model: scanModel,
          plan: dbUser.plan,
          inputTokens: scanInputTokens,
          outputTokens: scanOutputTokens,
          costUsd: calculateScanCostUsd(scanModel, scanInputTokens, scanOutputTokens),
          sourceHash,
          referralEligible: false,
          outcome: "EMPTY",
          selectedBookmaker: normalizedBookmaker,
          detectedBookmaker,
          detectionConfidence,
          promptVersion: SCAN_PROMPT_VERSION,
          durationMs: Date.now() - scanStartedAt,
          betsDetected: 0,
        },
        select: { id: true },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        await releaseQuota();
        return NextResponse.json({ error: t("duplicateScan") }, { status: 409 });
      }
      throw error;
    }
    await releaseQuota();
    await recordGrowthEventSafely({
      name: "scan_empty",
      userId: user.id,
      properties: { bookmaker: normalizedBookmaker, scan_duration_ms: Date.now() - scanStartedAt },
    });
    // Un résultat vide est un résultat métier, pas une panne technique. Le
    // client peut ainsi proposer un partage volontaire sans relancer l'OCR.
    return NextResponse.json({
      bets: [],
      scan: {
        usageId: emptyScanUsage.id,
        rawExtraction,
        model: scanModel,
        promptVersion: SCAN_PROMPT_VERSION,
        supportStatus,
        detectedBookmaker,
        detectionConfidence,
        earnedReferralScans: 0,
        outcome: "EMPTY",
      },
    });
  }

  // 5. Paris existants de l'utilisateur → base du repérage de doublons sans ticketRef.
  const existing = await prisma.bet.findMany({
    where: { bankroll: { userId: user.id } },
    select: { date: true, stake: true, odds: true, description: true, ticketRef: true },
  });
  const existingCandidates = existing.map((b) => ({
    date: b.date.toISOString().slice(0, 10),
    stake: b.stake,
    odds: b.odds,
    description: b.description ?? "",
  }));
  const existingTicketRefs = existing.map((bet) => bet.ticketRef);

  // 6. Normalisation vers ParsedBet (result FR → enum ; flags de review).
  const bets: ParsedBet[] = rawBets.map((raw) => {
    const r = raw as Record<string, unknown>;
    const boosted = Boolean(r.boosted);
    const result = labelToBetResult(String(r.result ?? "")) ?? "EN_ATTENTE";
    const { sport, betType, taxonomyMismatch } = normalizeTaxonomyPair(
      taxonomy,
      String(r.sport ?? "Autre sport"),
      String(r.betType ?? "Autre")
    );
    const bet: ParsedBet = {
      ticketRef: r.ticketRef ? String(r.ticketRef).trim() || null : null,
      date: isoDateOrNull(r.date),
      sport,
      // Les nouveaux couples restent disponibles pour validation ; seuls les
      // mélanges connus et incohérents (ex. Cyclisme + Buteur) sont ramenés à Autre.
      betType,
      description: String(r.description ?? ""),
      eventResult: r.eventResult ? String(r.eventResult).trim() || null : null,
      stake: numOrNull(r.stake),
      odds: numOrNull(r.odds),
      boosted,
      originalOdds: boosted ? numOrNull(r.originalOdds) : null,
      freebet: Boolean(r.freebet),
      live: Boolean(r.live),
      result,
      cashOutAmount: result === "CASHE" ? numOrNull(r.cashOutAmount) : null,
      taxonomyMismatch,
    };
    // Doublon potentiel : uniquement pour les paris sans référence de ticket.
    if (
      hasKnownTicketReference(bet.ticketRef, existingTicketRefs) ||
      (!bet.ticketRef && looksLikeParsedDuplicate(bet, existingCandidates))
    ) {
      bet.possibleDuplicate = true;
    }
    return bet;
  });

  const referralEligible = !isRescanAfterUnimportedAnalysis && hasValidReferralScan(bets);
  let scanUsage;
  try {
    // Le journal de consommation est également l'événement idempotent utilisé
    // par le programme de parrainage. L'index userId/sourceHash bloque les
    // doublons, y compris lors de requêtes concurrentes.
    scanUsage = await prisma.scanUsage.create({
      data: {
        userId: user.id,
        model: scanModel,
        plan: dbUser.plan,
        inputTokens: scanInputTokens,
        outputTokens: scanOutputTokens,
        costUsd: calculateScanCostUsd(scanModel, scanInputTokens, scanOutputTokens),
        sourceHash,
        referralEligible,
        outcome: "READY",
        selectedBookmaker: normalizedBookmaker,
        detectedBookmaker,
        detectionConfidence,
        promptVersion: SCAN_PROMPT_VERSION,
        durationMs: Date.now() - scanStartedAt,
        betsDetected: bets.length,
      },
      select: { id: true },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      await releaseQuota();
      return NextResponse.json({ error: t("duplicateScan") }, { status: 409 });
    }
    throw error;
  }

  const referralResult = referralEligible
    ? await processValidReferralScan(user.id, scanUsage.id)
    : { earnedReferralScans: 0 };

  quotaReserved = false;
  await recordGrowthEventSafely({
    name: "scan_result_ready",
    userId: user.id,
    properties: {
      bookmaker: normalizedBookmaker,
      detected_bookmaker: detectedBookmaker,
      screenshots_count: 1,
      bets_detected: bets.length,
      scan_duration_ms: Date.now() - scanStartedAt,
      parser_version: SCAN_PROMPT_VERSION,
    },
  });
  return NextResponse.json({
    bets,
    scan: {
      usageId: scanUsage.id,
      rawExtraction,
      model: scanModel,
      promptVersion: SCAN_PROMPT_VERSION,
      supportStatus,
      detectedBookmaker,
      detectionConfidence,
      earnedReferralScans: referralResult.earnedReferralScans,
    },
  });
}
