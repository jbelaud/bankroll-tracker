// Taxonomie des sports et types de paris — COPIE VERBATIM de l'artifact de
// référence (bankroll-tracker.jsx, lignes 15-25). Cette taxonomie vit côté
// application (pas d'enum en base) et peut évoluer sans migration. Réutilisée
// par le prompt d'extraction IA et (à venir) la saisie manuelle.

export const SPORTS: Record<string, string[]> = {
  Football: [
    "Résultat du match",
    "Victoire finale du tournoi",
    "Vainqueur de groupe",
    "Double chance",
    "Buteur",
    "Double buteur",
    "Passeur décisif",
    "Double passeur décisif",
    "Buteur ou passeur",
    "Top buteur du tournoi",
    "But sur penalty",
    "Minute du but",
    "Type de but",
    "Les 2 équipes marquent",
    "Nombre de tirs cadrés",
    "Écart de buts",
    "Mi-temps/Fin de match",
    "Première équipe à marquer",
    "Over/Under buts",
    "Qualification",
    "Handicap",
    "Score exact",
    "Mymatch",
    "Combiné",
    "Autre",
  ],
  Cyclisme: ["Top 1", "Top 3", "Top 10", "Vainqueur d'étape", "Classement général", "Combiné", "Autre"],
  Tennis: ["Vainqueur du match", "Total de jeux", "Score exact (sets)", "Vainqueur du set", "Combiné", "Autre"],
  Basketball: ["Vainqueur", "Total points", "Handicap", "Combiné", "Autre"],
  Rugby: ["Vainqueur", "Total points", "Handicap", "Combiné", "Autre"],
  MMA: ["Vainqueur du combat", "Méthode de victoire", "Nombre de rounds", "Décision", "Handicap", "Combiné", "Autre"],
  "Autre sport": ["Autre"],
};

export const SPORT_LIST = Object.keys(SPORTS);

/** Retourne les types disponibles pour un sport connu, sans jamais mélanger les taxonomies. */
export function getBetTypesForSport(sport: string): string[] {
  return SPORTS[sport] ?? SPORTS["Autre sport"];
}

/** Vérifie qu'un type de pari appartient bien au sport sélectionné. */
export function isCompatibleSportBetType(sport: string, betType: string): boolean {
  return getBetTypesForSport(sport).includes(betType);
}
