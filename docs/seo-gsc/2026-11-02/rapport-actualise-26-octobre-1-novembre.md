# Relevé SEO/GEO du 2 novembre 2026 — accès rétabli

Ce relevé remplace les constats de disponibilité du rapport préparé plus tôt le même jour. Jeremy a rouvert Search Console et autorisé la reprise. Source : interface Google Search Console connectée, sc-domain:kalivoa.com, recherche Web sans filtre supplémentaire. Exports CSV/ZIP et états d’interface archivés dans ce dossier. GSC Wizard reste indisponible pour abonnement expiré ; inutile de souscrire pour réaliser ce relevé par navigateur.

## Comparaison hebdomadaire, agrégée par propriété

Source : performance-interface.txt, filtres et colonnes de web/. Période demandée 26/10–01/11 contre 19–25/10 ; le 31/10 et le 01/11 restent potentiellement incomplets au relevé du 02/11. Mise à jour affichée : il y a 4,5 heures. Les chiffres récents restent provisoires. Les cartes et les CSV montrent les bonnes dates malgré l’anomalie « Invalid Date » du libellé de graphique déjà observée en octobre.

| Indicateur | 26/10–01/11 | 19–25/10 | Écart calculé |
|---|---:|---:|---:|
| Clics Web | 0 | 0 | 0 |
| Impressions Web | 14 | 10 | +4 |
| CTR Web | 0 % | 0 % | 0 point |
| Position moyenne Web | 6,9 | 13,3 | −6,4 |
| Impressions fonctionnalités IA, rapport distinct | 4 | 1 | +3 |

Quatorze impressions ne démontrent pas une tendance. La position moyenne change avec les requêtes et pages montrées : ne pas écrire que chaque page a gagné 6,4 places. Pas d’attribution aux posts X ou aux e-mails. Les lignes par page ne s’additionnent pas pour reconstituer les impressions de propriété.

## Pages et requêtes visibles

Source : web/Pages.csv, web/Requêtes.csv. Toutes les pages ci-dessous ont zéro clic.

| URL abrégée | Impressions actuelles | Précédentes | Position actuelle | Lecture |
|---|---:|---:|---:|---|
| /fr | 5 | 0 | 1,4 | Réapparition d’impressions HTTPS FR |
| /fr/partenaires | 2 | 0 | 2 | Première ligne dans cette comparaison |
| /fr/pricing | 2 | 0 | 2 | Exposition très limitée |
| /en/academie/verifier-paris-tipster | 4 | 1 | 13,25 | Piste 5–20 ; observer, page récente |
| /en/academie/calculer-roi-paris | 1 | 5 | 6 | Moins d’impressions malgré une meilleure position moyenne |
| /en/academie/comprendre-drawdown-bankroll | 1 | 1 | 8 | Stable en volume |
| /en/screenshot-import | 2 | 0 | 10 | Piste 5–20 ; aucune retouche immédiate |
| /en/faq | 1 | 0 | 9 | Piste de faible volume |
| /en/bookmakers/unibet | 1 | 0 | 11 | Piste de faible volume |
| /en/contact | 1 | 1 | 5 | Page utilitaire ; pas une priorité éditoriale |

Autres lignes actuelles : /contact (2 impressions, position 2,5), /en/sales-terms (2, position 4), /fr/bookmakers/betclic et /fr/bookmakers/winamax (une chacune, position 2). /en/academie/comprendre-unites-bankroll et verifier-ticket-pari-scan ne reçoivent pas d’impression dans cet export, contre deux chacune auparavant. Ce n’est pas un diagnostic de désindexation. Aucune ligne /fr/academie/ n’est retournée pour cette semaine ; priorité FR maintenue.

Une seule requête visible : « how can i check if a tipster's results are genuine? », 1 impression, 0 clic, position 6 contre aucune ligne précédente. Première formulation conversationnelle documentée sur cette comparaison, en anglais. Ne pas l’attribuer à une URL précise sans croisement requête-page. Les autres recherches restent non visibles ; aucune intention commerciale, volume ou difficulté nouvelle n’est déduite.

Rapport IA distinct : /fr reçoit 3 impressions et /contact une ; anciennes variantes HTTP /fr : zéro contre une. Ces quatre impressions ne permettent pas de vérifier le texte d’une citation, une recommandation ou un service autre que les fonctionnalités IA de Google.

## Indexation et sitemap

- Rapport Pages inchangé, date **23/10/2026** : 54 indexées et 18 exclues parmi toutes les pages connues. Filtre sitemap : 42 indexées et 2 exclues parmi 44 prises en compte. Ces totaux historiques ne sont pas recalculés avec les inspections plus récentes.
- Inspection individuelle /fr/privacy le **02/11** : **URL sur Google, page indexée**. Dernière exploration affichée : 28/10/2026 à 21:08:00 ; récupération réussie, indexation autorisée, canonique déclarée /fr/privacy et Google retient l’URL inspectée. La demande du 28/10 a été suivie d’une nouvelle exploration ; aucune nouvelle demande nécessaire.
- /fr/partenaires : dernière inspection du 28/10 positive conservée ; sa nouvelle ligne de performance est distincte de cette inspection. Pas de contrôle répété inutile.
- Rapport Sitemaps le 02/11 : dernière lecture **29/10**, état « Opération effectuée », 44 pages découvertes, soumission datée du 12/10. Aucune resoumission effectuée.
- Sitemap public relu par navigateur le 02/11 : **44 URL, 22 FR et 22 EN**, inventaire et DOM XML archivés. Le périmètre actuel correspond aux 44 découvertes, mais le rapport d’indexation reste ancien : ne pas annoncer 44/44 indexées.

## Changement détecté : anciennes pages certification

Différence calculée entre le sitemap archivé du 22/10 (46 URL) et celui du 02/11 (44) : /fr/certification et /en/certification sont absentes aujourd’hui. Les deux adresses publiques affichent désormais une page « 404 — Kalivoa / page introuvable », vérifiée dans le navigateur. Aucun statut HTTP brut n’a été relevé ; il s’agit du contenu 404 affiché. Les sources locales contiennent encore la route et l’entrée sitemap, ce qui ne prouve pas l’état de la version déployée.

Jeremy a été interrogé sur le caractère volontaire de ce retrait. Aucun rétablissement, changement de canonique, redirection ou déploiement effectué sans clarification. Si le retrait est volontaire, vérifier les liens vers ces anciennes pages et documenter la destination de remplacement avant de choisir une éventuelle redirection. S’il est involontaire, examiner la version réellement déployée avant de produire un correctif isolé. Ne pas recréer une page concurrente par défaut.

## Priorité éditoriale unique

Diffuser le post sur le suivi d’un combiné, préparé dans ../../seo-content/post-x-combine-2026-11-02.md, à partir de l’article existant et de sa preuve publique. Aucun nouveau contenu public créé, aucun ancien article retouché. Cash out toujours reporté ; aucune nouvelle preuve demandée pour cet usage. Statut de publication des posts précédents non confirmé.

| Semaine | Objectif | Actions | Livrable | KPI |
|---|---|---|---|---|
| 7 · 02–08/11 | Diffuser une preuve FR et mesurer l’exposition | Actualiser GSC ; confirmer privacy ; relever le sitemap ; préparer la diffusion du combiné | Exports Web/IA, inspection, inventaire 44 URL, post X prêt | Web provisoire 0 clic/14 impressions ; IA 4 impressions ; privacy indexée |

## Trois actions prioritaires

1. Clarifie le retrait des deux pages certification. Livrable : décision de maintien du retrait ou diagnostic de déploiement avant correctif. Indicateur : destination publique et sitemap cohérents. Question envoyée à Jeremy ; aucune action publique dépendante effectuée.
2. Publie le post combiné si ce créneau est libre, puis transmets son URL. Livrable : un message public lié à l’article existant. Indicateur : réponses et visites mesurées. Une seule action éditoriale prioritaire.
3. Reprends la mesure hebdomadaire le 09/11, en vérifiant aussi les jours récents de ce relevé. Responsable : agent. Livrable : comparaison datée et maturité explicite. Indicateur : clics/impressions par propriété, exposition FR et exclusions actuelles ; pas de nouvelle demande privacy.

Aucun e-mail ni message à des prospects envoyé, aucun achat engagé, aucun changement du site publié.
