# Kalivoa — export Couverture du 7 octobre 2026

Source : `kalivoa.com-Coverage-2026-10-07.zip` fourni par Jeremy le 07/10/2026, propriété GSC, filtre **« Toutes les pages connues »**. La dernière date du graphique est le 04/10/2026. Cet export ne contient ni liste d'URL par motif ni rapport Performances par requête/page.

| Période du graphique | Dans l'index | Non indexées | Portée |
|---|---:|---:|---|
| 21/09/2026 | 30 | 11 | Toutes les pages connues |
| 04/10/2026 | 30 | 15 | Toutes les pages connues |

**Variation observée dans ce rapport :** +4 URL non indexées, tandis que le nombre indexé reste 30. Les 30 URL indexées du rapport ne sont **pas** un décompte des URL du sitemap. Le code actuel du sitemap contient 15 chemins × 2 langues = 30 URL, mais l'export ne permet pas de croiser chacune d'elles avec l'index de Google. Ne pas conclure à « 30/30 indexées ».

| Motif au 04/10 | URL | Détail disponible |
|---|---:|---|
| Page avec redirection | 6 | URL non listées dans l'export |
| Exclue par `noindex` | 3 | URL non listées dans l'export |
| Doublon sans canonique utilisateur sélectionnée | 2 | URL non listées dans l'export ; les deux pages FR légales étaient concernées au 29/09, à reconfirmer |
| Détectée, actuellement non indexée | 4 | Jeremy a fourni la liste GSC le 07/10 : `/en/extension`, `/en/partenaires`, `/fr/extension`, `/fr/partenaires` |
| Explorée, actuellement non indexée | 0 | Aucune |

**Croisement avec le sitemap :** les quatre URL « Détectée, actuellement non indexée » sont présentes dans le sitemap généré par le code actuel (15 chemins × 2 langues). Ces pages sont récentes ; le motif indique que Google connaît leur URL, mais ne les a pas encore explorées/indexées. Il ne prouve ni erreur technique ni faible qualité. Les quatre URL ne doivent pas être comptées parmi les 30 URL indexées de l'export. Le décompte exact indexées / 30 du sitemap reste à confirmer par filtre « Toutes les pages envoyées » ou inspections ciblées.

**Prochaine vérification :** relever dans GSC la date de dernière détection et l'état des quatre nouvelles URL, puis la liste actuelle des deux doublons. Vérifier que les nouvelles pages répondent en 200, sont liées depuis le site, et que le sitemap soumis est à jour. Conserver les pages marketing modifiées le 23/09 en observation. Aucun changement de contenu, title ou H1 n'est justifié par ce seul export.

**Données SEO manquantes :** export « Performances → Résultats de recherche » avec onglets Pages et Requêtes sur les trois derniers mois ou, au minimum, comparaison 28/09–04/10 avec 21/09–27/09. GSC Wizard n'est plus disponible depuis la fin de son essai ; aucun volume, clic ou position pour cette semaine n'est inféré à partir de l'export Couverture.

**Contrôle technique du 07/10 après publication de l'Académie :** les quatre URL « Détectée, actuellement non indexée » répondent en HTTP 200 sur le domaine public, chacune avec une canonical propre et sans `noindex` visible. Leur état d'indexation Google reste celui du rapport GSC jusqu'à nouvelle inspection. Le sitemap de production contient désormais 34 URL ; ce nouveau total ne modifie pas rétroactivement les 30 URL indexées du graphique arrêté au 04/10. Voir [le journal de publication](publication-academie-2026-10-07.md).
