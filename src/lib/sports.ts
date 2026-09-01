// Taxonomie standard des sports et types de paris. Elle vit côté application
// (pas d'enum en base), peut évoluer sans migration et reste extensible par
// utilisateur pour les disciplines ou marchés plus rares.

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
  "Football américain": ["Vainqueur", "Total points", "Handicap", "Combiné", "Autre"],
  Baseball: ["Vainqueur", "Total points", "Handicap", "Combiné", "Autre"],
  "Hockey sur glace": ["Vainqueur", "Total points", "Handicap", "Score exact", "Combiné", "Autre"],
  Rugby: ["Vainqueur", "Total points", "Handicap", "Combiné", "Autre"],
  Handball: ["Vainqueur", "Total points", "Handicap", "Combiné", "Autre"],
  Volleyball: ["Vainqueur du match", "Score exact (sets)", "Vainqueur du set", "Handicap", "Combiné", "Autre"],
  "Tennis de table": ["Vainqueur du match", "Score exact (sets)", "Vainqueur du set", "Handicap", "Combiné", "Autre"],
  Badminton: ["Vainqueur du match", "Score exact (sets)", "Vainqueur du set", "Handicap", "Combiné", "Autre"],
  Padel: ["Vainqueur du match", "Total de jeux", "Score exact (sets)", "Vainqueur du set", "Combiné", "Autre"],
  MMA: ["Vainqueur du combat", "Méthode de victoire", "Nombre de rounds", "Décision", "Handicap", "Combiné", "Autre"],
  Boxe: ["Vainqueur du combat", "Méthode de victoire", "Nombre de rounds", "Décision", "Combiné", "Autre"],
  Golf: ["Vainqueur", "Top 5", "Top 10", "Face-à-face", "Combiné", "Autre"],
  "Formule 1": ["Vainqueur", "Podium", "Top 10", "Face-à-face", "Combiné", "Autre"],
  "Sports mécaniques": ["Vainqueur", "Podium", "Top 10", "Face-à-face", "Combiné", "Autre"],
  Esport: ["Vainqueur du match", "Vainqueur de la carte", "Handicap", "Score exact", "Combiné", "Autre"],
  Cricket: ["Vainqueur", "Total points", "Handicap", "Combiné", "Autre"],
  Fléchettes: ["Vainqueur du match", "Handicap", "Score exact", "Combiné", "Autre"],
  Snooker: ["Vainqueur du match", "Handicap", "Score exact", "Combiné", "Autre"],
  Athlétisme: ["Vainqueur", "Podium", "Top 10", "Face-à-face", "Autre"],
  Natation: ["Vainqueur", "Podium", "Top 10", "Face-à-face", "Autre"],
  "Sports d'hiver": ["Vainqueur", "Podium", "Top 10", "Face-à-face", "Autre"],
  "Courses hippiques": ["Gagnant", "Placé", "Couplé", "Trio", "Combiné", "Autre"],
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
