# Durcissement hébergement, e-mails et fonctions

Ce qui ne peut pas être fait dans le code se règle dans les tableaux de bord. À cocher avant chaque mise en production.

## Vercel (hébergement)
- [ ] **Spend Management** (Settings > Billing) : plafond dur activé, avec « mettre en pause les projets en production » au-delà du budget et alertes à 50 / 75 / 100 %.
- [ ] **Vercel Firewall** (projet > Firewall) : Attack Challenge Mode prêt à être activé en cas d'attaque ; règle de rate limit sur `/api/*` (ex. 120 req/min/IP) et sur `/auth/*` (ex. 20 req/min/IP).
- [ ] Protection DDoS : incluse par défaut sur Vercel (réseau edge), rien à activer.
- [ ] Fluid compute > **Maximum concurrency / instances** : fixer une limite (ex. 20) pour que les fonctions ne s'étendent pas sans borne.
- [ ] Crons : seuls `/api/cron/*` protégés par `CRON_SECRET` sont déclarés dans `vercel.json`.

## Supabase
- [ ] Auth > Rate Limits : vérifier les plafonds d'envoi d'e-mails et de tentatives de connexion.
- [ ] Settings > Billing : Spend Cap activé.
- [ ] La clé `SUPABASE_SECRET_KEY` n'existe qu'en variable serveur (jamais `NEXT_PUBLIC_*`) ; elle n'est importée que par des modules `server-only`.

## Resend / e-mails
- Les e-mails envoyés sont transactionnels (facturation, retrait, inactivité, parrainage). Aucun envoi marketing n'existe aujourd'hui.
- Le consentement marketing est enregistré (`email_marketing_preferences` + journal `email_marketing_choices`). **Avant tout envoi marketing** : filtrer sur `enabled = true`, ajouter les en-têtes `List-Unsubscribe` / `List-Unsubscribe-Post` et un lien de désinscription dans le corps.
- Aucun SMS n'est envoyé. Si cela change : consentement préalable enregistré par numéro et réponse STOP obligatoire.

## Fonctions
- Aucune route ne s'appelle elle-même ni ne se redéclenche (vérifié : les crons ne font que des appels sortants vers Stripe/Resend).
- `/api/scan` (coût IA) est limité par utilisateur et par heure (`src/lib/scan/rate-limit.ts`).
- `/api/growth-events` (public) est limité à 60 req/min/IP et 4 Ko par requête.
