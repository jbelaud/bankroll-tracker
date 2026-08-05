// Traduction d'affichage pour les valeurs de la taxonomie sportive (sport,
// type de pari) et des résultats — la clé de recherche est TOUJOURS la
// chaîne française telle que stockée en base (bet.sport/bet.betType) ou
// l'enum Prisma (BetResult), jamais retraduite ni modifiée. Repli sur la
// valeur brute si absente du dictionnaire (type suggéré par l'IA non encore
// répertorié, etc.) — ne doit jamais faire planter l'affichage.
//
// `t` est typé en `any` ici volontairement : la clé recherchée est une
// donnée runtime (valeur stockée en base ou renvoyée par l'IA), jamais un
// littéral connu à la compilation — next-intl type `t()` sur l'union stricte
// des clés du namespace, incompatible par nature avec une recherche dynamique.
export function translateTaxonomy(
  t: unknown,
  raw: string
): string {
  // next-intl restreint volontairement la clé au namespace connu, alors que
  // cette valeur vient de la base ou de l'IA. L'assertion reste confinée ici.
  const translator = t as { (key: string): string; has(key: string): boolean };
  return translator.has(raw) ? translator(raw) : raw;
}
