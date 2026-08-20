import { NextResponse, type NextRequest } from "next/server";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { labelToBetResult } from "@/lib/bet-result";
import { looksLikeParsedDuplicate } from "@/lib/scan/duplicate";
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
import { bookmakerKind } from "@/lib/bookmakers";
import { parseScanAnalysis } from "@/lib/scan/response";
import { rulesForTestedProfile } from "@/lib/scan/bookmaker-profile";
import { isBankrollLockedForUser } from "@/lib/billing/bankroll-access";

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
  if (await isBankrollLockedForUser(user.id, bankrollId)) {
    return NextResponse.json({ error: t("bankrollLocked") }, { status: 403 });
  }
  const profile = await prisma.bookmakerScanProfile.findUnique({
    where: { bookmaker: bankroll.bookmaker },
    select: { supportStatus: true, rules: true },
  });
  const supportStatus = profile?.supportStatus ?? (bookmakerKind(bankroll.bookmaker) === "tested" ? "TESTED" : "UNTESTED");

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
  try {
    const response = await analyzeTicketImage({
      base64,
      mediaType,
      taxonomy,
      bookmaker: bankroll.bookmaker,
      bookmakerRules: rulesForTestedProfile(profile),
    });
    scanModel = response.model;
    const analysis = parseScanAnalysis(response.text);
    rawBets = analysis.bets;
    rawExtraction = analysis;
    detectedBookmaker = analysis.detectedBookmaker;
    detectionConfidence = analysis.detectionConfidence;

    // Une analyse peut coûter des tokens même si aucun pari n'est trouvé.
    // L'échec de la télémétrie ne doit jamais empêcher l'utilisateur de scanner.
    try {
      await prisma.scanUsage.create({
        data: {
          userId: user.id,
          model: response.model,
          plan: dbUser.plan,
          inputTokens: response.inputTokens,
          outputTokens: response.outputTokens,
          costUsd: calculateScanCostUsd(
            response.model,
            response.inputTokens,
            response.outputTokens
          ),
        },
      });
    } catch (usageError) {
      console.error("[scan] impossible d'enregistrer la consommation", usageError);
    }
  } catch (e) {
    await releaseQuota();
    console.error("[scan] extraction échouée", e);
    return NextResponse.json({ error: t("analysisFailed") }, { status: 502 });
  }

  if (rawBets.length === 0) {
    await releaseQuota();
    return NextResponse.json({ error: t("noBetsFound") }, { status: 422 });
  }

  // 5. Paris existants de l'utilisateur → base du repérage de doublons sans ticketRef.
  const existing = await prisma.bet.findMany({
    where: { bankroll: { userId: user.id } },
    select: { date: true, stake: true, odds: true, description: true },
  });
  const existingCandidates = existing.map((b) => ({
    date: b.date.toISOString().slice(0, 10),
    stake: b.stake,
    odds: b.odds,
    description: b.description ?? "",
  }));

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
    if (!bet.ticketRef && looksLikeParsedDuplicate(bet, existingCandidates)) {
      bet.possibleDuplicate = true;
    }
    return bet;
  });

  quotaReserved = false;
  return NextResponse.json({
    bets,
    scan: {
      rawExtraction,
      model: scanModel,
      promptVersion: SCAN_PROMPT_VERSION,
      supportStatus,
      detectedBookmaker,
      detectionConfidence,
    },
  });
}
