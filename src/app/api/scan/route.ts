import Anthropic from "@anthropic-ai/sdk";
import { NextResponse, type NextRequest } from "next/server";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { labelToBetResult } from "@/lib/bet-result";
import { buildExtractionPrompt } from "@/lib/scan/extraction-prompt";
import { looksLikeParsedDuplicate } from "@/lib/scan/duplicate";
import { checkScanRateLimit } from "@/lib/scan/rate-limit";
import { checkMonthlyQuota, releaseMonthlyQuota } from "@/lib/scan/monthly-quota";
import { getServerLocale as getLocale } from "@/lib/i18n/get-server-locale";
import { calculateScanCostUsd, SCAN_MODEL } from "@/lib/scan/cost";
import type { ParsedBet } from "@/lib/scan/types";

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

// Parsing robuste identique à l'artifact : retire d'éventuelles balises markdown
// puis extrait le tableau JSON entre le premier [ et le dernier ].
function parseBetsArray(text: string): unknown[] {
  const cleaned = text.replace(/```json|```/g, "").trim();
  const start = cleaned.indexOf("[");
  const end = cleaned.lastIndexOf("]");
  if (start === -1 || end === -1 || end < start) {
    throw new Error("Format de réponse inattendu");
  }
  const parsed = JSON.parse(cleaned.slice(start, end + 1));
  if (!Array.isArray(parsed)) throw new Error("Le JSON n'est pas un tableau");
  return parsed;
}

function num(v: unknown): number {
  return Number(v) || 0;
}
function numOrNull(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
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
  // 2bis. Quota mensuel lié au plan (5 gratuit / 100 Premium) — distinct du
  // rate-limit horaire ci-dessus, qui protège contre l'abus indépendamment
  // du plan.
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: t("apiKeyMissing") }, { status: 503 });
  }

  // 3. Récupération de l'image (une par requête — le client boucle pour la progression).
  const formData = await request.formData();
  const image = formData.get("image");
  if (!(image instanceof File)) {
    return NextResponse.json({ error: t("missingImage") }, { status: 400 });
  }
  if (!ALLOWED_MEDIA.includes(image.type as Media)) {
    return NextResponse.json({ error: t("unsupportedImage") }, { status: 415 });
  }
  const mediaType = image.type as Media;
  const bytes = await image.arrayBuffer();
  if (bytes.byteLength === 0) {
    return NextResponse.json({ error: t("emptyImage") }, { status: 400 });
  }
  if (bytes.byteLength > MAX_IMAGE_BYTES) {
    return NextResponse.json({ error: t("imageTooLarge") }, { status: 413 });
  }
  const base64 = Buffer.from(bytes).toString("base64");

  const dbUser = await prisma.user.findUniqueOrThrow({
    where: { id: user.id },
    select: { plan: true },
  });

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
    await releaseMonthlyQuota(user.id);
  };

  // 4. Appel Claude Vision (SDK officiel, clé serveur uniquement).
  const anthropic = new Anthropic();
  let rawBets: unknown[];
  try {
    const response = await anthropic.messages.create({
      // Haiku 4.5 ne supporte ni le thinking adaptatif ni le paramètre effort.
      model: SCAN_MODEL,
      max_tokens: 8192,
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } },
            { type: "text", text: buildExtractionPrompt() },
          ],
        },
      ],
    });
    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n");
    rawBets = parseBetsArray(text);

    // Une analyse peut coûter des tokens même si aucun pari n'est trouvé.
    // L'échec de la télémétrie ne doit jamais empêcher l'utilisateur de scanner.
    try {
      await prisma.scanUsage.create({
        data: {
          userId: user.id,
          model: SCAN_MODEL,
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
          costUsd: calculateScanCostUsd(
            response.usage.input_tokens,
            response.usage.output_tokens
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
    const bet: ParsedBet = {
      ticketRef: r.ticketRef ? String(r.ticketRef).trim() || null : null,
      date: String(r.date ?? new Date().toISOString().slice(0, 10)),
      sport: String(r.sport ?? "Autre sport"),
      betType: String(r.betType ?? "Autre"),
      description: String(r.description ?? ""),
      eventResult: r.eventResult ? String(r.eventResult).trim() || null : null,
      stake: num(r.stake),
      odds: num(r.odds),
      boosted,
      originalOdds: boosted ? numOrNull(r.originalOdds) : null,
      freebet: Boolean(r.freebet),
      live: Boolean(r.live),
      result,
      cashOutAmount: result === "CASHE" ? numOrNull(r.cashOutAmount) : null,
    };
    // Doublon potentiel : uniquement pour les paris sans référence de ticket.
    if (!bet.ticketRef && looksLikeParsedDuplicate(bet, existingCandidates)) {
      bet.possibleDuplicate = true;
    }
    return bet;
  });

  quotaReserved = false;
  return NextResponse.json({ bets });
}
