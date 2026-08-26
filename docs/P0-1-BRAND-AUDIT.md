# P0.1 — Audit de marque BetTrack vers Kalivoa

Date de l’audit : 24 août 2026.

## Résultat

Les surfaces produit et marketing présentes dans le dépôt utilisent désormais la marque Kalivoa. Les identifiants techniques historiques dont le renommage pourrait casser une compatibilité ou une configuration externe sont volontairement conservés et documentés ci-dessous.

## Classement des occurrences

| Classe | Surfaces auditées | Décision |
| --- | --- | --- |
| A. Visible utilisateur | navigation, connexion, inscription, onboarding, dashboard, Scan, compte, referral, administration, feedback, erreurs, exports | Migrées vers Kalivoa. Les noms de fichiers téléchargés deviennent `kalivoa-*`. |
| B. Marketing / SEO | landing, footer, FAQ, pages publiques, metadata, Open Graph, JSON-LD, `llms.txt`, manifest PWA, documentation SEO | Migrés vers Kalivoa. Une icône Kalivoa SVG remplace la référence explicite à l’ancien favicon générique. |
| C. Légal | confidentialité, conditions d’utilisation, jeu responsable, mentions légales, conditions de vente | Seul le nom du produit a été migré. Aucune raison sociale n’a été inventée ou remplacée. Les informations d’éditeur restent à compléter et ETS BELAUD doit rester l’entité juridique si c’est l’identité validée par le fondateur. |
| D. Configuration externe | domaine public, Google OAuth/Supabase, Stripe, Discord, Vercel, Search Console | Dépendances identifiées ci-dessous. Aucune valeur externe n’a été modifiée depuis le dépôt. |
| E. Technique interne | nom du package, dépôt GitHub, ancien prototype `bankroll-tracker.jsx`, commentaires de filiation | Conservés : leur renommage n’apporte aucun bénéfice utilisateur au P0. |
| F. Base et historique | migrations Prisma, format d’export `bettrack-export-v1`, cookie `bettrack_referral_context` | Conservés pour éviter une rupture de données, d’import ou d’attribution. |

## Identifiants historiques conservés

- `STRIPE_BETA_COUPON_ID="bettrack_beta_first_year"` : identifiant d’un objet Stripe externe existant ; ne pas renommer sans créer et valider un nouvel objet Stripe.
- `format: "bettrack-export-v1"` : version de contrat d’export ; le contenu reste lisible tandis que le nom de fichier visible est Kalivoa.
- `bettrack_referral_context` : cookie technique existant ; le renommer supprimerait le contexte referral des sessions en cours.
- `bankroll-tracker` et `bankroll-tracker.jsx` : noms internes et prototype historique, non visibles dans le produit livré.
- migrations Prisma historiques : aucun renommage esthétique.

## Dépendances externes identifiées

- Domaine canonique : `https://kalivoa.com`. `kalivoa.fr`, les variantes `www` et l’ancien domaine `bettrack-mvp.vercel.app` doivent rediriger vers cette origine en conservant le chemin et les paramètres.
- Vercel : projet lié localement, mais aucun domaine n’est déclaré dans les fichiers versionnés.
- Supabase Auth / Google OAuth : callback fixe `/auth/callback`; les URL de site, redirect URIs, domaines autorisés et le nom affiché sur l’écran OAuth doivent être contrôlés dans Supabase et Google Cloud.
- Stripe : Checkout, portail client et webhook `/api/stripe/webhook` utilisent des identifiants externes. Le code n’embarque pas de nom BetTrack visible en dur dans ces parcours, mais le branding Dashboard Stripe doit être contrôlé séparément.
- Discord communauté : invitation publique présente dans l’application. Le webhook privé de qualité utilise `DISCORD_SCAN_FEEDBACK_WEBHOOK_URL` et affiche maintenant `Kalivoa · Scan bêta`.
- Search Console : aucune preuve de propriété ou de soumission n’est versionnée dans le dépôt.

## Risques liés au changement de domaine

Si un ancien domaine public BetTrack existe, il doit rester attaché au déploiement et rediriger toutes les routes vers le domaine Kalivoa en conservant chemin et paramètres. Avant bascule :

1. définir l’URL HTTPS canonique exacte dans `NEXT_PUBLIC_APP_URL` pour Production et Preview si nécessaire ;
2. ajouter le nouveau domaine et conserver l’ancien sur Vercel ;
3. mettre à jour Supabase Auth, Google OAuth et les domaines autorisés ;
4. contrôler les URL de retour Stripe et la destination du webhook sans changer son secret inutilement ;
5. vérifier CORS et les liens d’e-mail ;
6. vérifier `/robots.txt`, `/sitemap.xml`, `/llms.txt`, `/manifest.webmanifest` et les canonicals ;
7. ajouter la propriété Search Console du nouveau domaine, soumettre le sitemap, puis surveiller les redirections et erreurs d’indexation.

## Limites de validation locale

- Le branding Google OAuth, Stripe, Vercel, Discord et Search Console ne peut pas être confirmé à partir du code seul.
- L’identité légale publique est signalée comme incomplète dans les pages actuelles ; elle nécessite une validation humaine avant ouverture commerciale.
- La présence et la configuration des variables de production ne sont pas déductibles du fichier local.
