# Checklist SEO et GEO — Kalivoa

## Ce qui est implémenté

- Site public localisé en français et anglais sous /fr et /en.
- Landing page, pages Fonctionnalités, Import par capture, Suivi de bankroll, Bookmakers, Tarifs et FAQ.
- Métadonnées localisées : titres, descriptions, canonicals, Open Graph, Twitter et liens hreflang (fr, en, x-default).
- Données structurées visibles et cohérentes : Organization, WebSite, SoftwareApplication, FAQPage et BreadcrumbList.
- Image Open Graph générée par Next.js, manifeste et favicon.
- robots.txt et sitemap.xml générés par Next.js.
- Les routes privées, les parcours d’authentification et les API sont exclus du crawl via robots.txt ; les surfaces authentifiées utilisent aussi noindex.
- Les aperçus Vercel ne sont pas indexables : leur robots.txt interdit le crawl et leur sitemap est vide.
- OAI-SearchBot est explicitement autorisé sur le contenu public en production, avec les routes privées exclues.
- GPTBot est explicitement bloqué. Cette décision sépare la découverte par ChatGPT Search de l’entraînement ou de la collecte par GPTBot ; elle peut être revue par le propriétaire du produit.
- /llms.txt décrit Kalivoa et pointe vers les pages publiques canoniques. C’est un complément expérimental, pas un remplacement du HTML, du sitemap ou des données structurées.

## Avant la production

1. Configurer NEXT_PUBLIC_APP_URL avec l’URL canonique HTTPS exacte de production, sans chemin final.
2. Vérifier que l’URL ouvre bien /fr, /en, /robots.txt, /sitemap.xml, /llms.txt et /manifest.webmanifest.
3. Vérifier que l’hébergement ou le pare-feu n’interdit pas OAI-SearchBot sur les pages publiques.
4. Vérifier qu’aucune URL de prévisualisation Vercel n’est déclarée comme domaine canonique.
5. Ajouter les informations légales réelles : éditeur, adresse, contact public, hébergement et conditions de vente approuvées.
6. Publier uniquement les prix, limites de scans et conditions de renouvellement qui ont été approuvés.

## Search Console et Bing Webmaster Tools

1. Ajouter et vérifier le domaine de production dans Google Search Console.
2. Soumettre <NEXT_PUBLIC_APP_URL>/sitemap.xml.
3. Ajouter le même domaine dans Bing Webmaster Tools puis soumettre le sitemap.
4. Contrôler l’inspection d’URL pour /fr, /en et les pages Import/Fonctionnalités.
5. Vérifier la prise en compte des canonicals et les paires hreflang.
6. Rechercher les erreurs d’exploration des routes publiques et vérifier que les routes privées ne sont jamais indexées.

## Vérification OAI-SearchBot

1. Ouvrir <NEXT_PUBLIC_APP_URL>/robots.txt en production.
2. Vérifier la présence d’un groupe User-Agent: OAI-SearchBot avec Allow: /.
3. Vérifier que les chemins /api/, /auth/, /fr/dashboard, /en/dashboard et les autres zones privées restent dans Disallow.
4. Contrôler les journaux CDN/serveur si disponibles : le bot doit recevoir une réponse HTTP 200 sur les pages publiques, sans challenge anti-bot.
5. Ne pas conclure qu’une autorisation de crawl garantit une citation dans ChatGPT Search.

## Analytics et trafic ChatGPT

Aucun fournisseur d’analytics n’est configuré dans le dépôt à ce jour. Lorsqu’un outil respectueux du consentement sera retenu :

1. Préserver tous les paramètres UTM pendant les redirections et les liens internes.
2. Créer les événements de conversion pour la CTA héro, la CTA finale, l’ouverture de la page Tarifs et l’inscription terminée.
3. Créer un rapport pour utm_source=chatgpt.com, en distinguant visites, inscriptions et conversions.
4. Vérifier que le déclenchement des tags respecte la solution de consentement choisie.

## Feuille de route de contenu

Créer des contenus utiles, sourcés et signés seulement lorsque l’expertise nécessaire est disponible :

1. Comment suivre une bankroll de paris sportifs.
2. ROI et yield : définitions, formules et limites d’interprétation.
3. Pourquoi les tableurs de suivi sont souvent abandonnés.
4. Importer des tickets de pari depuis des captures d’écran.
5. Tracker de bankroll ou Excel : critères de choix.
6. Analyser ses résultats par bookmaker, sport et type de pari.

Ne pas créer de pages de blog génériques ou répétitives uniquement pour les moteurs de recherche.

## Maintenance récurrente

- À chaque livraison : exécuter les contrôles de type, lint, tests, build et une vérification navigateur des pages FR/EN.
- À chaque changement de prix, quota ou compatibilité bookmaker : mettre à jour simultanément la landing, la FAQ, la page concernée, les métadonnées et les données structurées.
- Chaque mois : consulter Search Console, Bing Webmaster Tools, les erreurs de crawl et les requêtes de recherche.
- Chaque trimestre : relire les pages légales, les informations de confidentialité et la politique GPTBot/OAI-SearchBot.
- Après toute modification de domaine : mettre à jour NEXT_PUBLIC_APP_URL, resoumettre le sitemap et vérifier les canonicals/hreflang.
