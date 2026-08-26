import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const PUBLIC_GROWTH_EVENT_NAMES = [
  "landing_view",
  "signup_started",
  "scan_opened",
  "screenshots_selected",
  "scan_started",
  "verification_started",
  "bet_removed_from_import",
  "bet_excluded_from_import",
  "duplicate_warning_shown",
  "bookmaker_mismatch_warning_shown",
] as const;

export type PublicGrowthEventName = (typeof PUBLIC_GROWTH_EVENT_NAMES)[number];

type GrowthProperties = Record<string, string | number | boolean | null | undefined>;

// Les événements ne sont pas une copie du ticket : un petit contrat de
// propriétés primitives évite qu'une image, un texte OCR ou une donnée privée
// se retrouve accidentellement dans la table (ou plus tard dans un outil tiers).
function cleanProperties(properties?: GrowthProperties): Prisma.InputJsonObject | undefined {
  if (!properties) return undefined;
  const cleaned: Record<string, string | number | boolean | null> = {};
  for (const [key, value] of Object.entries(properties)) {
    if (!/^[a-z][a-z0-9_]{0,63}$/.test(key)) continue;
    if (typeof value === "string") cleaned[key] = value.slice(0, 120);
    else if (typeof value === "number" && Number.isFinite(value)) cleaned[key] = value;
    else if (typeof value === "boolean" || value === null) cleaned[key] = value;
  }
  return Object.keys(cleaned).length ? cleaned : undefined;
}

export async function recordGrowthEvent({
  name,
  userId,
  anonymousId,
  properties,
}: {
  name: string;
  userId?: string | null;
  anonymousId?: string | null;
  properties?: GrowthProperties;
}) {
  const event = await prisma.growthEvent.create({
    data: {
      name: name.slice(0, 80),
      userId: userId || null,
      anonymousId: anonymousId?.slice(0, 100) || null,
      properties: cleanProperties(properties),
    },
  });

  // Lorsqu'une inscription relie enfin le navigateur anonyme à un compte,
  // les étapes déjà effectuées sur ce même navigateur (landing et démarrage
  // d'inscription) deviennent exploitables dans le funnel. Les événements
  // plus récents reçoivent directement l'id de session côté serveur.
  if (name === "signup_completed" && userId && anonymousId) {
    await prisma.growthEvent.updateMany({
      where: {
        anonymousId: anonymousId.slice(0, 100),
        userId: null,
      },
      data: { userId },
    });
  }

  return event;
}

// Les métriques ne doivent jamais empêcher une action produit (import,
// création de bankroll, auth) si une migration est temporairement absente ou
// si la base est indisponible. Les appelants utilisent ce wrapper explicitement.
export async function recordGrowthEventSafely(input: Parameters<typeof recordGrowthEvent>[0]) {
  try {
    await recordGrowthEvent(input);
  } catch (error) {
    console.error("[growth] événement non enregistré", error);
  }
}

export function isPublicGrowthEventName(value: unknown): value is PublicGrowthEventName {
  return typeof value === "string" && (PUBLIC_GROWTH_EVENT_NAMES as readonly string[]).includes(value);
}
