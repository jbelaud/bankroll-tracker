# Audit technique des 26 URL du sitemap — 25/09/2026

Source : crawl en direct de la propriété `sc-domain:kalivoa.com` avec GSC Wizard, après le déploiement `f8db588`. Périmètre : les 13 chemins publics de `src/app/sitemap.ts` dans les deux langues, soit 26 URL.

| Contrôle | Résultat |
|---|---:|
| Réponse HTTP 200 | 26/26 |
| Pages déclarées indexables dans le HTML | 26/26 |
| Canonique propre à l'URL | 26/26 |
| Liens hreflang détectés | 3/3 par page (`fr`, `en`, `x-default` dans le code) |
| Erreur critique ou élevée signalée par l'outil | 0 |
| Erreur moyenne signalée par l'outil | 2, sur les deux accueils |

Les deux alertes moyennes indiquent « Organization is missing required field logo ». La [documentation Google sur `Organization`](https://developers.google.com/search/docs/appearance/structured-data/organization) précise qu'**aucune propriété n'est obligatoire** pour ce type ; `logo` est recommandé lorsqu'un logo représentatif est disponible. Ce n'est donc pas un blocage d'indexation à corriger dans l'urgence. Les accueils exposent déjà `Organization`, `WebSite`, `SoftwareApplication` et `FAQPage`; les FAQ FR/EN exposent `FAQPage`. Les autres remarques de l'outil sont de faible sévérité et n'indiquent pas de défaut d'indexabilité.

Cet audit vérifie le HTML servi et les balises détectées. Il ne démontre ni la canonique que Google choisira après exploration, ni l'indexation effective. L'inspection GSC du même jour indiquait encore **24/26 URL indexées** ; `/fr/privacy` et `/fr/responsible-gambling` attendaient une nouvelle exploration après le correctif.

**Liens internes :** le layout public affiche l'en-tête et le pied de page sur chaque page marketing. Ces composants relient, dans chaque langue, l'accueil et les pages `features`, `screenshot-import`, `bankroll-tracking`, `bookmakers`, `pricing`, `faq`, `privacy`, `terms` et `responsible-gambling`. L'index `bookmakers` relie les trois fiches `unibet`, `betclic` et `winamax`, également dans chaque langue. Le graphe de liens défini par le code couvre ainsi **les 26 URL sans page orpheline**. Cette conclusion repose sur le rendu du layout et les liens du code ; un crawl indépendant des liens entrants pourra la confirmer lors du prochain contrôle.
