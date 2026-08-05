# Compte rendu — Modèle économique, coûts et tarification (BetTrack)

*Document de synthèse — juillet 2026*

> **État de l'implémentation (août 2026).** Le MVP applique actuellement 5 scans/mois pour le plan gratuit et 100 scans/mois pour Premium, avec un seul prix Stripe configuré. Les paliers 10/200 et l'évolution de prix décrits plus bas sont une cible commerciale à confirmer avant d'être exposée aux utilisateurs.

---

## 1. Résumé

Ce document consolide tout ce qu'on a établi ensemble sur le modèle économique : la structure freemium/premium, les coûts réels de l'API Claude (Haiku 4.5), les seuils de rentabilité, et les garde-fous techniques à mettre en place pour protéger la marge.

**Le point clé à retenir** : à ton volume d'usage réel (quelques centaines de screenshots/an), le coût de l'IA est négligeable — sous 1€/an. Le risque de rentabilité ne vient pas de l'utilisateur moyen, mais des cas extrêmes (imports massifs ponctuels), qu'on neutralise avec un plafond mensuel plutôt qu'un prix plus élevé. Le vrai facteur limitant n'est d'ailleurs pas le coût IA mais le nombre d'abonnés nécessaires pour couvrir les charges fixes (section 4bis).

---

## 2. Structure de l'offre

| | **Gratuit** | **Année 1 (lancement)** | **Année 2 et suivantes** |
|---|---|---|---|
| Prix | 0€ | 9,99€/an | 19,99€/an |
| Bankrolls | 2 maximum | Illimitées | Illimitées |
| Saisie manuelle | Illimitée | Illimitée | Illimitée |
| Import par screenshot (IA) | 10/mois | **100/mois** | **200/mois** |
| Insights IA | — | Inclus (avec cooldown) | Inclus (avec cooldown) |
| Statistiques avancées | Basiques | Complètes | Complètes |

**Pourquoi un plafond mensuel plutôt que quotidien** : l'usage réel constaté est en rafales sporadiques (rattrapage d'un lot de screenshots en une session), pas un usage quotidien régulier. Un plafond par jour pénaliserait ce pattern d'usage normal ; un plafond mensuel l'autorise pleinement tout en donnant un meilleur coût plafonné dans le pire des cas (voir section 4).

### Pack complémentaire (dépannage ponctuel, Premium uniquement)

Pour un abonné Premium qui dépasse son quota mensuel (100 ou 200 selon l'année) sans vouloir attendre le mois suivant : **5€ = +50 screenshots**, valables jusqu'à la fin du mois en cours (pas de report, même logique que le quota de base).

| | Valeur |
|---|---|
| Coût IA (50 screenshots) | 0,165 € |
| Frais Stripe (sur 5€) | 0,325 € |
| Revenu net | 4,675 € |
| **Marge** | **4,51 € (90%)** |

**Cohérence avec l'abonnement** : ~0,10€/screenshot en pack vs ~0,008-0,01€/screenshot amorti dans l'abonnement annuel — un écart volontaire (comme une recharge à l'unité vs un forfait), qui ne cannibalise pas l'abonnement. Acheter un pack chaque mois pendant un an reviendrait à 60€/an pour 600 screenshots, largement moins avantageux que l'abonnement standard (19,99€/an pour 2 400 inclus).

**Restriction volontaire** : réservé aux abonnés Premium (pas au freemium), pour ne pas diluer l'incitation à passer à l'abonnement — le freemium doit rester un levier d'acquisition, pas un point de vente à l'unité indéfiniment renouvelable.

---

## 2bis. TVA — à surveiller, pas à appliquer par défaut

Le seuil de franchise en base de TVA pour une SASU de prestations de services est de **37 500€ de CA HT/an** (tolérance jusqu'à 41 250€). Tant que ce seuil n'est pas atteint, **aucune TVA n'est facturée** — les prix affichés (9,99€/19,99€) sont encaissés intégralement (avant Stripe et autres charges), pas de 20% à retrancher. Selon les scénarios de croissance envisagés (section 6), ce seuil n'est atteint qu'à partir de l'année 3 à 5 dans le meilleur des cas — à vérifier avec un professionnel une fois que le CA s'en approche, et à surveiller mois par mois plutôt qu'en fin d'année (le franchissement du seuil majoré déclenche la TVA au jour du dépassement, pas au 1er janvier suivant).

---

## 3. Coût réel de l'IA (Claude Haiku 4.5 + prompt caching)

### Par screenshot
| | Valeur |
|---|---|
| Coût par screenshot analysé | **0,0033 €** |
| Modèle utilisé | Haiku 4.5, avec prompt caching activé |

### Par profil d'utilisateur (coût IA annuel)
| Profil | Screenshots/an | Coût IA/an | Revenu (standard) | Marge nette/an | Marge % |
|---|---|---|---|---|---|
| Léger | 20 | 0,07 € | 19,99 € | 19,37 € | 97% |
| Moyen | 100 | 0,33 € | 19,99 € | 19,11 € | 96% |
| **Actif (ton profil réel)** | **300** | **1,00 €** | **19,99 €** | **18,44 €** | **92%** |
| Très actif | 1 000 | 3,33 € | 19,99 € | 16,11 € | 81% |
| Extrême (import ponctuel, ex. 15 ans d'historique) | 15 000 | 50,00 € | 19,99 € | **-30,52 €** | **-153%** |

**Lecture** : tant qu'un abonné reste dans une utilisation normale, la marge est excellente (92-97%). Le seul scénario problématique est l'import massif ponctuel — d'où l'importance du plafond mensuel.

**Note** : avec le plafond de 200 screenshots/mois retenu (année 2+), le scénario "extrême" à 15 000 screenshots/an ci-dessus n'est en réalité plus atteignable en un an sur l'offre payante (max théorique 2 400/an) — il faudrait plus de 6 ans d'utilisation au plafond maximum pour l'atteindre. Le tableau reste utile pour comprendre l'ordre de grandeur, mais le plafond rend ce cas impossible à réaliser d'un coup.

### Coût de l'Insights IA (Claude Haiku 4.5, séparé du scan)
- ~0,019 €/génération (résumé statistique + réponse structurée).
- Protégé par un **cooldown de 12h entre deux générations** par utilisateur, et le résultat est mis en cache/persisté plutôt que régénéré à chaque visite — ce qui borne le coût même en cas d'usage intensif de cette fonctionnalité.

---

## 4. Seuil de rentabilité et plafond de protection

### Seuil de rentabilité (prix 19,99€/an, année 2+)
| | Valeur |
|---|---|
| Frais Stripe sur cet abonnement | 0,55 € (1,5% + 0,25€) |
| Budget IA disponible après frais | 19,44 € |
| **Seuil de rentabilité** | **5 837 screenshots/an** (~486/mois) |

### Plafonds retenus : mensuels, pas quotidiens
Choix fait après avoir constaté un usage réel en rafales sporadiques plutôt que quotidien régulier — un plafond par jour aurait pénalisé cet usage normal sans bénéfice de coût supplémentaire (le coût total dépend du volume annuel, pas de sa répartition dans le temps).

| | Plafond | Max annuel | Coût IA (pire cas) | Revenu net | Marge (pire cas) |
|---|---|---|---|---|---|
| Année 1 (9,99€) | 100/mois | 1 200 | 3,96 € | 9,59 € | **+5,63 €/an (59%)** |
| Année 2+ (19,99€) | 200/mois | 2 400 | 7,92 € | 19,44 € | **+11,52 €/an (58%)** |

Ces plafonds restent très en dessous du seuil de rentabilité théorique (486/mois) — grosse marge de sécurité, et un plafond mensuel de 100-200 laisse la liberté de tout consommer en une seule session de rattrapage.

---

## 4bis. Le vrai seuil qui compte : les charges fixes

La marge par abonné est confortable, mais elle ne dit rien du **nombre d'abonnés nécessaires pour couvrir les charges fixes de la SASU**, qui existent indépendamment du volume d'usage IA :

| Charge fixe | Montant estimé |
|---|---|
| Expert-comptable *(ou gestion en interne assistée par IA, cf. section suivante)* | ~1 200-1 800€/an si externalisé |
| CFE | Exonérée les 2 premières années, puis variable selon commune |
| Hébergement + domaine | ~12-150€/an selon trafic |

**Abonnés payants nécessaires pour couvrir ~1 800€/an de charges fixes :**
| | Marge nette/abonné/an | Abonnés nécessaires |
|---|---|---|
| Année 1 (9,99€) | 5,63 € | **~320 abonnés** |
| Année 2+ (19,99€) | 11,52 € | **~156 abonnés** |

**Décision actée** : gestion comptable en interne (assistée par IA) pour les 1-2 premières années plutôt qu'un expert-comptable externe, ce qui réduit d'autant ce seuil de charges fixes à couvrir — mais nécessite une rigueur particulière sur le suivi du seuil de TVA, les produits constatés d'avance (abonnements annuels étalés sur 12 mois comptablement, pas reconnus en une fois), et la réconciliation Stripe. Un outil de suivi dédié à ces trois points a été spécifié pour une construction ultérieure.

---

## 5. Autres postes de coûts (hors IA)

| Poste | Coût estimé | Note |
|---|---|---|
| Hébergement Vercel | 0€ → ~20$/mois | Gratuit au démarrage, payant si trafic grossit |
| Base de données Supabase | 0€ → ~25$/mois | Idem |
| Paiement Stripe | 1,5% + 0,25€/transaction | Mange ~6-8% d'un abonnement à 9,99€ |
| Nom de domaine | ~12€/an | |
| Commission App Store/Play Store (si app mobile plus tard) | 15-30% sur paiements in-app | À anticiper dans le pricing si tu passes par Capacitor |

---

## 6. Projection de chiffre d'affaires (rappel)

*Hypothèses : croissance organique/communautaire, sans budget pub, conversion freemium 4-8%, churn ~30-35%/an. Chiffres illustratifs, pas une prévision garantie.*

| Scénario | An 1 | An 3 | An 5 | An 10 |
|---|---|---|---|---|
| Prudent | ~320 € | ~3 060 € | ~8 100 € | ~21 600 € |
| Médian | ~1 800 € | ~17 000 € | ~50 400 € | ~144 000 € |
| Optimiste | ~6 400 € | ~64 600 € | ~180 000 € | ~504 000 € |

---

## 7. Points de vigilance actés

- **Modèle IA** : rester sur Haiku pour l'extraction (rapport qualité/coût le plus sûr, déjà calibré et testé sur des centaines de vrais tickets). Une alternative moins chère existe (Gemini Flash-Lite, GPT-4.1 nano, ~10x moins cher) mais à ce volume l'économie est marginale — le risque de dégradation de fiabilité ne vaut pas l'économie tant qu'un vrai test comparatif n'a pas été fait.
- **Clé API séparée de l'abonnement Pro** : l'abonnement Claude Pro (22€/mois) ne couvre pas l'usage API en production — c'est un compte et une facturation distincts sur console.anthropic.com, payés à l'usage réel (les montants ci-dessus).
- **Affiliation bookmakers** : volontairement exclue du modèle économique de départ, en raison du contexte réglementaire français en tension sur la publicité des paris sportifs (voir le business plan initial pour le détail).
- **Concurrence (MaBankroll)** : gratuit, mais avec une fiabilité d'extraction inférieure sur nos tests (confond Simple/Combiné). La marge de manœuvre est sur la qualité de l'extraction et la granularité des types de paris, pas sur le prix.

---

## 8. Où on en est techniquement

- Scaffold Next.js + Prisma + Supabase : fait.
- Authentification (email + Google OAuth) : fonctionnelle et vérifiée.
- CRUD basique (bankrolls, paris) : en cours.
- UI/UX mobile-first : en cours (écrans Dashboard, Bankrolls, Scan, Stats, Compte, Historique en cours de génération).
- Route API sécurisée pour l'extraction IA (clé Anthropic côté serveur) : réalisée, avec contrôle d'origine, limites de taille/type, quotas et rate limiting.
- Stripe : pas encore commencé, volontairement repoussé après validation utilisateur.
