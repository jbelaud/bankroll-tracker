# BetTrack — UX responsive authentifiée

Dernière mise à jour : 23 août 2026.

## Architecture responsive

L’interface authentifiée conserve une seule architecture de routes et les mêmes actions serveur. La couche responsive est portée par le layout `(app)`, `AppNav` et les classes Tailwind des composants existants.

| Largeur | Navigation | Contenu |
| --- | --- | --- |
| Mobile et tablette (< 1024 px) | Navigation basse à cinq entrées, avec import central | Une colonne, actions tactiles d’au moins 44 px, espace réservé pour la navigation et le bandeau jeu responsable |
| Ordinateur (>= 1024 px) | Barre latérale persistante avec toutes les routes réelles, bouton d’import et déconnexion confirmée | En-tête compact, zone centrée jusqu’à 1536 px et grilles de contenu |
| Grand écran (>= 1280 px) | Même barre latérale | Grilles 12 colonnes, tableaux et cartes plus denses ; largeur maximum maîtrisée |

La barre latérale contient uniquement des routes existantes : tableau de bord, historique, Scan OCR, statistiques, bankrolls et compte. Sur desktop, ces entrées sont regroupées en **Suivi**, **Analyse** et **Gérer**, afin de faciliter le repérage sans créer de nouvelle fonctionnalité. La navigation basse mobile est conservée ; le libellé compact « Scan » y est maintenu et l’historique reste accessible depuis le tableau de bord et les liens existants, sans surcharger les cinq emplacements tactiles historiques.

## Composants desktop réutilisables

- `AppNav` : navigation basse mobile et navigation latérale desktop à partir de la même définition de routes.
- `AppTopBar` : en-tête desktop léger avec accès immédiat à l’import.
- `OnboardingCard` : parcours de démarrage en trois étapes, vertical sur mobile et réparti sur une ligne sur desktop ; le CTA ouvre directement la création de bankroll existante.
- `DesktopHistoryTable` : tableau de l’historique, alimenté par les mêmes données filtrées et les mêmes actions de modification, suppression et déplacement que les cartes mobile.
- `StatsWorkspace` : calendrier visible dans une colonne latérale sur desktop et conservé dans un tiroir sur mobile.

## État des routes

| Route | Mise en œuvre responsive |
| --- | --- |
| `/dashboard` | Grille 12 colonnes sur desktop : la synthèse « Bankroll globale » précède l’évolution du capital à gauche. Une colonne latérale rassemble les indicateurs, le quota de scans IA puis la communauté lorsqu’elle est pertinente. Sous les objectifs, les cartes « Mes bankrolls » et « Paris récents » commencent sur la même rangée en deux colonnes. Sans bankroll, le parcours de démarrage utilise une largeur contrôlée et un indicateur de progression desktop. |
| `/history` | Filtres disposés horizontalement sur desktop, tableau dense avec date, événement, sport/type, bankroll, mise, cote, résultat, P&L et actions ; cartes groupées et gestes tactiles conservés sur mobile. |
| `/scan` | Zone de dépôt desktop, sélection appareil photo/galerie préservée, limite actuelle de cinq captures préservée, revue en colonne latérale + cartes de validation en grille. |
| `/scan/manual` | Formulaire conservé avec largeur de lecture contrôlée sur grand écran. |
| `/stats` | Pour les comptes Premium, les Insights IA sont placés avant la vue d’ensemble. Les comptes gratuits voient un aperçu flouté sans données et un CTA vers l’abonnement ; l’action serveur applique la même restriction. Indicateurs en grille, courbe de bénéfice déjà présente dans le code, analyse, tableaux et calendrier latéral sur desktop ; filtres et calendrier en tiroirs sur mobile. |
| `/bankrolls` | Grille de cartes jusqu’à quatre colonnes selon la largeur, création non étirée inutilement. Le lien de démarrage `?create=1` ouvre la même création de bankroll existante puis nettoie l’URL. |
| `/bankrolls/[id]` | Répartition desktop entre capital, actions, mouvements, courbe et historique ; pile mobile conservée. |
| `/account` | Profil, abonnement, objectifs, préférences, retours, export, partages qualité et sécurité en grille sur desktop ; pile lisible sur mobile. |
| `/admin` | Bénéficie de la coque responsive ; son contenu métier n’a pas été modifié dans ce chantier. |

## Préservation mobile et accessibilité

- Les points de contact principaux conservent une hauteur minimale de 44 px (`min-h-touch`).
- La navigation basse, la zone sûre mobile et la réserve pour le bandeau jeu responsable sont maintenues.
- Les tableaux desktop ne sont pas compressés : les cartes et accordéons restent l’interface mobile.
- Les actions iconiques du tableau ont des libellés accessibles ; le P&L comporte signe et icône, en plus de la couleur.
- La barre latérale expose l’état de page courant via `aria-current` et la déconnexion garde sa confirmation existante.
- Les nouvelles chaînes sont disponibles en français et anglais. Les composants de partage qualité du compte sont désormais localisés.
- Les animations décoratives continuent de respecter `prefers-reduced-motion` via les tokens globaux existants.

## Vérifications réalisées

- `pnpm typecheck` : réussi.
- `pnpm lint` : réussi.
- `pnpm test` : 14 fichiers et 40 tests réussis.
- `pnpm build` : réussi.
- Contrôle JSON des fichiers `messages/fr.json` et `messages/en.json` : réussi.
- Le premier rendu du serveur de développement a attendu les polices Google avant de basculer sur les polices de secours. La vérification a ensuite été réalisée sur le serveur de production local : l’écran de connexion FR/EN ne présente ni dépassement horizontal, ni overlay, ni erreur console aux largeurs 375, 768, 1024, 1440 et 1920 px. `/fr/dashboard` redirige vers `/fr/login` sans session.

## Limites connues

- Les écrans authentifiés ne peuvent pas être inspectés visuellement avec des données réelles sans compte de test ou procédure de seed documentés.
- L’administration contient encore des chaînes françaises hors du périmètre de cette refonte responsive ; elle n’est pas déclarée entièrement traduite.
- La navigation mobile conserve volontairement cinq entrées. L’historique n’est pas ajouté comme sixième bouton pour préserver la densité et les cibles tactiles.

## Recommandations ultérieures

1. Ajouter une procédure locale de seed avec un compte de démonstration non sensible et des données représentatives.
2. Ajouter des tests de parcours visuels authentifiés aux cinq largeurs de référence (375, 768, 1024, 1440 et 1920 px).
3. Traduire l’administration et les derniers écrans d’erreur dans des namespaces `next-intl` dédiés.
4. Évaluer une alternative auto-hébergée aux polices distantes pour rendre les vérifications et démarrages hors ligne plus fiables.
