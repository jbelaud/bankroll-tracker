# Publication de l'Académie Kalivoa — 7 octobre 2026

Jeremy a autorisé la mise en ligne immédiate le 07/10/2026, en demandant d'accélérer le plan. Cette décision avance exceptionnellement l'ajout du lien de pied de page pendant la fenêtre d'observation des pages marketing. **Nouvelle observation de ces pages et des quatre nouvelles URL jusqu'au 05/01/2027 environ**, sans retouche de contenu ou de balises entre-temps.

## Livré

- Commit de production : `10758980fa4be740edae983f125334e9028fdbef` ; projet Vercel `bankroll-tracker`, déploiement `dpl_4jDxJxSwfTE7RZ2e8zZ5Pi2xdEFh`, état `READY`.
- Hub FR/EN : `https://kalivoa.com/fr/academie` et `https://kalivoa.com/en/academie`.
- Article FR/EN : `https://kalivoa.com/fr/academie/verifier-ticket-pari-scan` et `https://kalivoa.com/en/academie/verifier-ticket-pari-scan`.
- Preuve réelle : capture de relecture fournie par Jeremy, sans identifiant ni référence de ticket visible, validée pour publication après aperçu.
- Lien de pied de page, canonical/hreflang FR/EN/x-default, balisage `Article` et `BreadcrumbList`, date de publication `2026-10-07`.

## Vérifications après déploiement

- Quatre URL de l'Académie : HTTP 200, canonical vers `https://kalivoa.com` ; FR/EN répondent dans la bonne langue.
- Capture PNG : HTTP 200 ; affichage vérifié dans l'article en production.
- Sitemap de production : HTTP 200, **34 URL** (17 chemins × 2 langues), incluant les quatre nouvelles URL. Le sitemap de prévisualisation est vide par conception.
- La page d'accueil FR affiche le lien « Académie » ; l'article FR a ses trois alternates hreflang (`fr`, `en`, `x-default`).
- Vercel : aucun groupe d'erreur runtime signalé pour les nouvelles routes dans l'heure suivant la publication.
- Les quatre URL `/fr/extension`, `/en/extension`, `/fr/partenaires`, `/en/partenaires` signalées « Détectée, non indexée » par GSC répondent en 200, portent chacune une canonical propre et n'affichent pas de `noindex`. Cela ne prouve pas leur indexation Google.

## Suivi restant

- Le rapport GSC Performances récent manque : GSC Wizard retourne `payment_required`. Ne pas inférer de clics, impressions ou positions après publication.
- Au prochain relevé, vérifier si les quatre URL de l'Académie et les quatre pages extension/partenaires sont explorées puis indexées. Comparer les requêtes visibles et les pages avec la période antérieure.
- Avant une nouvelle page éditoriale, contrôler le sitemap et les requêtes GSC disponibles. Le brouillon tipster attend une URL publique et l'accord de son propriétaire pour servir de preuve vécue.
