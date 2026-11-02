# Présentation de la certification — 20 octobre 2026

Publié sur https://kalivoa.com, déploiement `dpl_4fBeHKfb9XcM9Y3MBCWPCFH1QAuP`.

La certification dispose désormais d'une section placée juste après l'introduction de l'accueil, d'un accès dans les menus ordinateur et mobile, d'un lien dans le footer et d'une page dédiée en français et en anglais. Le texte d'introduction, la FAQ, les métadonnées, le sitemap et llms.txt la présentent également.

La page explique les niveaux de preuve, le score pondéré par les mises en unités, la publication volontaire, le journal des corrections et les limites de la certification. Les affirmations reposent sur le fonctionnement du code effectivement publié. Le parcours illustré est explicitement identifié comme un exemple sans données de joueur.

## Vérification

- Compilation Next.js et TypeScript réussie ; ESLint ciblé réussi.
- Dix contrôles HTTP réussis avant promotion, puis dix sur le domaine public : accueil, certification, FAQ et tarification dans les deux langues, sitemap et llms.txt.
- Navigation ordinateur et mobile vérifiée dans le navigateur, lecture mobile sans débordement horizontal, ancre des niveaux et ouverture de la FAQ fonctionnelles. Le viewport temporaire a été réinitialisé.
- Preuves et captures : `docs/audit-certification/`.

## Périmètre du déploiement

La publication utilise la copie isolée `.vercel/commercial-release-2026-10-19/app`, avec une sélection des seuls fichiers de présentation et des clés de traduction concernées. Les changements indépendants présents dans le répertoire de travail n'ont pas été publiés. Les règles de calcul de certification, les données, les paiements et les paramètres de bêta n'ont pas été modifiés.

Le manifeste des sources publiées est conservé dans `docs/audit-certification/source-manifest-2026-10-20.json`. Déploiement précédent pour retour éventuel : `dpl_E22fk2eksSAD7reL5Hqv5NeGsRXu`.
