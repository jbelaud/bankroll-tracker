export function bankrollPublicationError(referenceCapital: number | null, missingUnitCount: number): string | null {
  if (!referenceCapital || referenceCapital <= 0) {
    return "Définis d’abord le montant de référence de cette bankroll. Il est indispensable pour convertir chaque mise en unités.";
  }
  if (missingUnitCount > 0) {
    return `Complète d’abord les unités de ${missingUnitCount} ancien(s) pari(s). Une bankroll publique doit afficher une mise en unités pour chaque pari.`;
  }
  return null;
}
