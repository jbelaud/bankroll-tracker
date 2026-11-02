# CGV et cohérence des pages publiques — 22 octobre 2026

## Résultat

CGV finalisées sous la version **2026-10-22.1**, en français et en anglais, avec téléchargement texte et archive contractuelle immuable. La bêta reste gratuite ; publier ces CGV ne vaut ni ouverture des souscriptions ni conversion automatique des comptes gratuits.

## Corrections

- Identité ETS BELAUD, téléphone, TVA, périmètre France, prix TTC, offre de bienvenue et règles des scans réunis dans les CGV. Suppression des mentions obsolètes d'informations légales manquantes.
- Renouvellement annuel et information dédiée prévue à J−45, droits en cas de défaut d'information, résiliation à l'échéance, rétractation avec remboursement intégral même après utilisation de scans, calcul du délai, garantie du service numérique et médiation SMP explicités.
- Ajout des dispositions relatives aux données, à la preuve électronique et à l'évolution du service, ainsi que reproduction des textes de reconduction/résiliation. Les anciennes versions des CGV restent inchangées.
- Distinction visible entre la bêta gratuite (compte bêta-testeur : 4 bankrolls et 50 scans/30 jours), le futur gratuit et le futur Premium. Les prix, l'éligibilité des 15 premiers nouveaux comptes après bêta et l'échéance du 31 décembre 2026 n'ont pas été modifiés.
- Certification, publication volontaire et limites des preuves cohérentes avec les CGU et les pages de présentation ; aucun agrément officiel, audit bookmaker ou gain garanti annoncé.
- Confidentialité de l'extension alignée avec le fournisseur réellement utilisé, les signalements privés et la politique générale. Ajout des métadonnées canoniques FR/EN de cette page.
- Accès aux liens/codes/conditions partenaires clairement situé dans le compte. Les pages bookmakers distinguent l'indépendance éditoriale des éventuels liens de parrainage ou partenaires.
- Illustration de l'inscription identifiée comme contenant des données fictives, sans promesse de gains.

## Régression du déploiement précédent

Le domaine kalivoa.com pointait vers `dpl_7zF6HfS4TuWmr23gtRURgQcq6Wbc`, source Git `3493cafd9497c912bf16dcc699b58229715aa070`. Cette source conservait les correctifs de sécurité récents mais n'incluait pas les travaux commerciaux et de certification précédemment publiés depuis la copie isolée. Les routes Certification, Offre de bienvenue et Rétractation étaient ainsi en 404 dans les deux langues ; les informations légales et la confidentialité étaient revenues à une ancienne présentation.

Le jeu commercial précédemment vérifié a été réintégré dans une copie de cette source actuelle, sans remplacer les fichiers de sécurité : Next.js et eslint-config-next restent en **16.3.8**, les protections MFA administrateur et contre les redirections externes sont conservées, comme la vérification de propriété Rustine et la migration de permissions existante. Aucune migration n'a été exécutée durant cette révision.

La copie isolée de publication se trouve dans `.vercel/public-review-2026-10-22/app`. Le répertoire principal conserve d'autres travaux indépendants et ne doit pas être déployé en bloc pour reproduire cette publication. Les fichiers éditoriaux concernés et les clés de traduction ont été synchronisés sélectivement dans le répertoire principal. Manifeste : `audit-public-2026-10-22/source-manifest.json`.

## Contrôles

- Audit initial : **69 pages et ressources publiques** découvertes dans le sitemap, les liens de navigation et les pages d'authentification publiques ; six erreurs 404, aucune traduction manquante.
- Avant promotion : **73 pages et ressources** vérifiées sur le déploiement protégé, incluant les formulaires et les nouvelles CGV téléchargeables ; aucune erreur HTTP ni traduction manquante. Le contrôle porte sur les pages publiques du site et leurs ressources, pas sur l'énumération des bankrolls et profils appartenant aux utilisateurs.
- **148 tests réussis dans 17 fichiers**, dont les tests d'intégration PostgreSQL local, la fermeture du paiement malgré des CGV finalisées, les garanties d'accès administrateur et les destinations de retour de connexion.
- ESLint ciblé, TypeScript et compilation Next.js/Vercel réussis.
- Après publication : contrôle intégral sur le domaine public et refus des accès privés/notifications non signées. Preuves : `audit-public-2026-10-22/`.

Les contrôles ne créent ni paiement ni email client. Aucun réglage Stripe ou fournisseur n'a été changé. Les quatre indicateurs de lancement commercial et de suppression automatique sont restés à `false` ; seule leur valeur non sensible a été consultée. L'extraction globale de l'environnement a été refusée par le contrôle automatique et n'a pas été réalisée ; aucun fichier d'environnement de production n'a été créé.

## Décisions conservées pour l'ouverture

La date de fin de bêta reste à choisir. L'offre de bienvenue garde sa limite au 31 décembre 2026, à revalider si l'ouverture est décalée. Le point d'hébergement déjà identifié reste à régler avant vente. Ces décisions ne sont pas remplacées par la finalisation du texte des CGV ; les ventes restent fermées.

## Références consultées

- [Service Public — contenu des CGV](https://entreprendre.service-public.gouv.fr/vosdroits/F33527).
- [Code de la consommation — reconduction et résiliation](https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006069565/LEGISCTA000032221235/).
- [Article L. 215-4 — reproduction des dispositions](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000032226974/2026-05-06).
- [Article L. 241-3 — remboursement et intérêts](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000032226409/2026-04-09).
- [SMP — site du médiateur, adresse et modalités](https://www.mediateur-consommation-smp.fr/).

Certaines pages Légifrance ont refusé la lecture automatisée ; les résultats indexés disponibles et les références accessibles ont été utilisés. Le texte des garanties du service numérique précédemment vérifié est conservé.

## Publication finale et contrôle visuel

Version finale publiée : `dpl_3ugdeC9zD3h7r7Xagz4XeW9Nhkpt`, https://bankroll-tracker-mdbn2g8z9-ets-belaud.vercel.app, promue sur https://kalivoa.com. Le déploiement intermédiaire vérifié `dpl_7YCnu7QknyasVMEz2n5KS2LAuxTA` reste disponible pour un retour applicatif éventuel.

Le parcours final des 73 pages et ressources est complet, sans erreur HTTP ni message de traduction manquante. Les CGV et la tarification ont été inspectées sur ordinateur et mobile : pas de débordement horizontal sur le viewport mobile testé (375 px utiles). Les liens de téléchargement sont présents, la certification apparaît dans le menu mobile et la page partenaires a été vérifiée après son chargement interactif. Le viewport temporaire a été réinitialisé.

Les fichiers téléchargeables FR/EN correspondent exactement à la version archivée 2026-10-22.1. Les contrôles d’accès public ont conservé les refus attendus : administration 401, pages privées 307 vers la connexion, cron 401 et webhooks non signés 400. Les captures et preuves sont enregistrées dans `audit-public-2026-10-22/`.

Au jour d’ouverture, le bandeau indiquant la bêta gratuite devra être adapté et la version applicable archivée avec cette nouvelle date ; cela ne modifie pas le fond des conditions finalisées ici. Aucune date d’ouverture n’a été inventée.
