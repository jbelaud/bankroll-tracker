import { prisma } from "./prisma";
import { SPORTS } from "./sports";

export type Taxonomy = Record<string, string[]>;

const MAX_LABEL_LENGTH = 80;

function key(value: string) {
  return value.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase("fr");
}

/** Normalise une valeur provenant de l'IA ou d'un formulaire avant stockage. */
export function cleanTaxonomyLabel(value: string): string | null {
  const cleaned = value
    .normalize("NFKC")
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  return cleaned.length > 0 && cleaned.length <= MAX_LABEL_LENGTH ? cleaned : null;
}

function findExistingLabel(values: string[], candidate: string): string | undefined {
  const candidateKey = key(candidate);
  return values.find((value) => key(value) === candidateKey);
}

// Les fournisseurs OCR emploient parfois le nom du sport, parfois celui de
// la discipline ou de la promotion. On les ramène à une seule taxonomie pour
// que les statistiques et filtres ne fragmentent pas le MMA.
const STANDARD_SPORT_ALIASES: Record<string, string> = {
  "arts martiaux mixtes": "MMA",
  "mixed martial arts": "MMA",
  ufc: "MMA",
};

function normalizeStandardSport(taxonomy: Taxonomy, value: string): string {
  const known = findExistingLabel(Object.keys(taxonomy), value);
  if (known) return known;
  return STANDARD_SPORT_ALIASES[key(value)] ?? value;
}

/** Fusionne la taxonomie standard et les ajouts privés d'un utilisateur. */
export function mergeTaxonomy(
  entries: ReadonlyArray<{ sport: string; betType: string }> = []
): Taxonomy {
  const taxonomy: Taxonomy = Object.fromEntries(
    Object.entries(SPORTS).map(([sport, betTypes]) => [sport, [...betTypes]])
  );

  for (const entry of entries) {
    const rawSport = cleanTaxonomyLabel(entry.sport);
    const rawBetType = cleanTaxonomyLabel(entry.betType);
    if (!rawSport || !rawBetType) continue;

    const sport = findExistingLabel(Object.keys(taxonomy), rawSport) ?? rawSport;
    taxonomy[sport] ??= [];
    if (!findExistingLabel(taxonomy[sport], rawBetType)) {
      taxonomy[sport].push(rawBetType);
    }
  }

  return taxonomy;
}

export async function getUserTaxonomy(
  userId: string,
  includeHistoricalBets = true
): Promise<Taxonomy> {
  const [entries, historicalBets] = await Promise.all([
    prisma.userTaxonomyEntry.findMany({
      where: { userId },
      select: { sport: true, betType: true },
      orderBy: { createdAt: "asc" },
    }),
    includeHistoricalBets
      ? prisma.bet.findMany({
          where: { bankroll: { userId } },
          select: { sport: true, betType: true },
          distinct: ["sport", "betType"],
        })
      : Promise.resolve([]),
  ]);
  // Les données historiques créées avant cette fonctionnalité enrichissent
  // elles aussi la liste de leur propriétaire, sans migration intrusive.
  return mergeTaxonomy([...entries, ...historicalBets]);
}

function isKnownTypeForAnotherSport(sport: string, betType: string): boolean {
  return Object.entries(SPORTS).some(
    ([knownSport, types]) => knownSport !== sport && Boolean(findExistingLabel(types, betType))
  );
}

export function normalizeTaxonomyPair(
  taxonomy: Taxonomy,
  rawSport: string,
  rawBetType: string
): { sport: string; betType: string; taxonomyMismatch: boolean } {
  const cleanedSport = cleanTaxonomyLabel(rawSport) ?? "Autre sport";
  const sport = normalizeStandardSport(taxonomy, cleanedSport);
  const cleanedBetType = cleanTaxonomyLabel(rawBetType) ?? "Autre";
  const availableTypes = taxonomy[sport] ?? [];
  const betType = findExistingLabel(availableTypes, cleanedBetType) ?? cleanedBetType;

  // On bloque les associations manifestement incohérentes pour un sport
  // standard (Cyclisme + Buteur, Football + Top 1…). Les nouveaux sports
  // restent, eux, libres pour pouvoir apprendre une taxonomie personnelle.
  const taxonomyMismatch = Boolean(SPORTS[sport])
    && !findExistingLabel(availableTypes, betType)
    && isKnownTypeForAnotherSport(sport, betType);

  return {
    sport,
    betType: taxonomyMismatch ? SPORTS[sport].at(-1) ?? "Autre" : betType,
    taxonomyMismatch,
  };
}

function isDefaultPair(sport: string, betType: string): boolean {
  return Boolean(SPORTS[sport] && findExistingLabel(SPORTS[sport], betType));
}

/** Enregistre les nouveaux couples seulement après validation/import du pari. */
export async function saveUserTaxonomyEntry(userId: string, sport: string, betType: string) {
  if (isDefaultPair(sport, betType)) return;

  await prisma.userTaxonomyEntry.upsert({
    where: { userId_sport_betType: { userId, sport, betType } },
    create: { userId, sport, betType },
    update: {},
  });
}
