export type InsightResult = {
  appreciation: string;
  points_forts: string[];
  points_amelioration: string[];
  recommandations: string[];
};

// Partagée entre la Server Action (générateur) et la page Stats (calcul du
// cooldown restant à l'affichage) — ne peut pas vivre dans insights.ts, un
// fichier "use server" ne peut exporter que des fonctions async.
export const INSIGHTS_COOLDOWN_DAYS = 7;
export const INSIGHTS_COOLDOWN_MS = INSIGHTS_COOLDOWN_DAYS * 24 * 60 * 60 * 1000;
