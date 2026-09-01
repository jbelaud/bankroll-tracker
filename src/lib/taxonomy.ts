import { prisma } from "./prisma";
import { SPORTS } from "./sports";

export type Taxonomy = Record<string, string[]>;

const MAX_LABEL_LENGTH = 80;

function key(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("fr");
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
  basket: "Basketball",
  "american football": "Football américain",
  hockey: "Hockey sur glace",
  "ice hockey": "Hockey sur glace",
  pingpong: "Tennis de table",
  "ping pong": "Tennis de table",
  "arts martiaux mixtes": "MMA",
  "mixed martial arts": "MMA",
  ufc: "MMA",
  boxing: "Boxe",
  box: "Boxe",
  f1: "Formule 1",
  formula1: "Formule 1",
  "formula 1": "Formule 1",
  motorsport: "Sports mécaniques",
  "motor sports": "Sports mécaniques",
  esports: "Esport",
  "e-sport": "Esport",
  darts: "Fléchettes",
  athletics: "Athlétisme",
  swimming: "Natation",
  "winter sports": "Sports d'hiver",
  horseracing: "Courses hippiques",
  "horse racing": "Courses hippiques",
};

const STANDARD_COMPETITION_ALIASES: Record<string, { sport: string; competition: string }> = {
  nba: { sport: "Basketball", competition: "NBA" },
  euroleague: { sport: "Basketball", competition: "EuroLeague" },
  nfl: { sport: "Football américain", competition: "NFL" },
  nhl: { sport: "Hockey sur glace", competition: "NHL" },
  mlb: { sport: "Baseball", competition: "MLB" },
  ufc: { sport: "MMA", competition: "UFC" },
};

const STANDARD_BET_TYPE_ALIASES: Record<string, string[]> = {
  "match result": ["Résultat du match", "Vainqueur du match", "Vainqueur du combat", "Vainqueur"],
  "resultat match": ["Résultat du match", "Vainqueur du match", "Vainqueur du combat", "Vainqueur"],
  "resultat du match": ["Résultat du match", "Vainqueur du match", "Vainqueur du combat", "Vainqueur"],
  "match winner": ["Vainqueur du match", "Vainqueur du combat", "Résultat du match", "Vainqueur"],
  winner: ["Vainqueur", "Vainqueur du match", "Vainqueur du combat", "Résultat du match"],
  vainqueur: ["Vainqueur", "Vainqueur du match", "Vainqueur du combat", "Résultat du match"],
  victoire: ["Vainqueur", "Vainqueur du match", "Vainqueur du combat", "Résultat du match"],
  moneyline: ["Vainqueur", "Vainqueur du match", "Vainqueur du combat", "Résultat du match"],
  "fight winner": ["Vainqueur du combat"],
  "total points": ["Total points"],
  "over under": ["Total points", "Total de jeux", "Over/Under buts", "Nombre de rounds"],
  accumulator: ["Combiné"],
  parlay: ["Combiné"],
  other: ["Autre"],
};

export function normalizeSportContext(
  taxonomy: Taxonomy,
  rawValue: string
): { sport: string; competition: string | null } {
  const value = cleanTaxonomyLabel(rawValue) ?? "Autre sport";
  const competitionAlias = STANDARD_COMPETITION_ALIASES[key(value)];
  if (competitionAlias) return competitionAlias;
  const known = findExistingLabel(Object.keys(taxonomy), value);
  return {
    sport: known ?? STANDARD_SPORT_ALIASES[key(value)] ?? value,
    competition: null,
  };
}

function normalizeStandardSport(taxonomy: Taxonomy, value: string): string {
  return normalizeSportContext(taxonomy, value).sport;
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
  const aliasedBetType = STANDARD_BET_TYPE_ALIASES[key(cleanedBetType)]
    ?.find((candidate) => findExistingLabel(availableTypes, candidate));
  const betType = findExistingLabel(availableTypes, cleanedBetType) ?? aliasedBetType ?? cleanedBetType;

  // On signale les associations manifestement incohérentes pour permettre une
  // vérification, sans remplacer le marché détecté par « Autre » : le libellé
  // exact reste exploitable dans les statistiques et enrichit la taxonomie
  // personnelle une fois l'import validé.
  const taxonomyMismatch = Boolean(SPORTS[sport])
    && !findExistingLabel(availableTypes, betType)
    && isKnownTypeForAnotherSport(sport, betType);

  return {
    sport,
    betType,
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
