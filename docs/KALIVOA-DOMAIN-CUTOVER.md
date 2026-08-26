# Bascule de domaine Kalivoa

Origine canonique : `https://kalivoa.com`.

| Hôte | Rôle attendu | Destination |
| --- | --- | --- |
| `kalivoa.com` | domaine principal | sert l’application |
| `www.kalivoa.com` | variante | redirection permanente vers `kalivoa.com` |
| `kalivoa.fr` | domaine secondaire | redirection permanente vers `kalivoa.com` |
| `www.kalivoa.fr` | variante | redirection permanente vers `kalivoa.com` |
| `bettrack-mvp.vercel.app` | ancien domaine public | redirection permanente vers `kalivoa.com` |

## Implémenté dans le dépôt

- les canonicals, le sitemap, `robots.txt`, `llms.txt`, le manifest, Stripe et les liens publics prennent `NEXT_PUBLIC_APP_URL` comme origine unique ;
- le proxy redirige les hôtes secondaires et l’ancien domaine vers `kalivoa.com`, avec le chemin et la query string intacts ;
- la configuration de référence définit `https://kalivoa.com` pour Production.

## Configuration Vercel nécessaire

1. attacher `kalivoa.fr`, `www.kalivoa.fr`, `kalivoa.com` et `www.kalivoa.com` au projet `bankroll-tracker` ;
2. définir `kalivoa.com` comme domaine de production ;
3. créer les redirections de domaine vers `kalivoa.com` ;
4. conserver `bettrack-mvp.vercel.app` attaché tant que les liens historiques existent ;
5. définir `NEXT_PUBLIC_APP_URL=https://kalivoa.com` dans Production ;
6. redéployer, puis vérifier les retours OAuth et Stripe.

## Contrôles après mise en ligne

- `https://kalivoa.com/fr`, `/en`, `/robots.txt`, `/sitemap.xml`, `/llms.txt` et `/manifest.webmanifest` répondent en HTTPS ;
- chaque hôte secondaire répond par une redirection permanente en gardant par exemple `/fr/signup?invite=test` ;
- les canonicals et les URLs Open Graph commencent par `https://kalivoa.com` ;
- les e-mails de confirmation, Google OAuth et Checkout Stripe reviennent sur `kalivoa.com` ;
- Search Console reçoit le sitemap `https://kalivoa.com/sitemap.xml` après vérification de propriété.
