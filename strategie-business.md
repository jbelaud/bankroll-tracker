# BetTrack — scénarios de lancement et modèle économique

Document de réflexion avant le lancement public. Il ne modifie pas les limites actuelles de l'application.

## Objectif

Permettre à un parieur de tester réellement BetTrack, notamment l'import par capture, tout en gardant le coût IA maîtrisé. L'offre payante doit être assez généreuse pour créer de la valeur, sans promettre une consommation IA illimitée qui deviendrait déficitaire.

## Hypothèses utilisées

- Modèle actuel : Claude Haiku 4.5.
- Tarif API indicatif : 1 $ / million de tokens en entrée et 5 $ / million de tokens en sortie.
- Coût estimé d'une capture de ticket : environ 0,005 à 0,01 $ dans l'usage normal.
- Une capture contient en moyenne trois paris.
- Un import de 1 000 paris représente donc environ 334 captures.
- Les chiffres sont des estimations : l'espace Administration collecte désormais les tokens et le coût réel de chaque nouveau scan afin de remplacer ces hypothèses par des données réelles.

Sources : [tarification Claude](https://platform.claude.com/docs/en/about-claude/pricing), [vision Claude](https://platform.claude.com/docs/en/build-with-claude/vision), [tarification Stripe France](https://stripe.com/fr/pricing).

## Ce qui est déjà en place dans l'application

- Les scans invalides, sans pari détecté ou en erreur ne consomment pas le quota mensuel.
- Le plan Premium est actuellement réglé à 120 scans par heure et 500 scans par mois pour faciliter les tests et l'import d'historique.
- L'Administration enregistre, à partir de son déploiement, les tokens d'entrée, les tokens de sortie et le coût USD exact de chaque scan.

> Attention : 500 scans **par mois** ne doit pas être conservé pour une offre annuelle à bas prix ou une offre à vie. Un utilisateur qui l'utilise chaque mois peut coûter 30 à 60 $ d'API par an dans l'estimation normale, avant les autres frais.

## Scénario 1 — bêta gratuite maîtrisée

### Proposition

- Compte gratuit sans carte bancaire.
- 20 scans IA au total, non renouvelables.
- Saisie manuelle des paris disponible sans coût IA.
- Accès aux fonctionnalités cœur : historique, bankroll, statistiques et correction des scans.

### Pourquoi

Vingt captures représentent environ 60 paris importés : c'est suffisant pour comprendre la valeur de BetTrack. Un utilisateur peut ensuite continuer à utiliser l'application via la saisie manuelle, sans te coûter d'IA.

### Budget indicatif

| Volume de testeurs | 20 scans chacun | Coût IA estimé |
|---:|---:|---:|
| 100 | 2 000 scans | 10 à 20 $ |
| 500 | 10 000 scans | 50 à 100 $ |
| 1 000 | 20 000 scans | 100 à 200 $ |

### Protections à prévoir avant une ouverture large

- Vérification d'e-mail Supabase obligatoire.
- Limite horaire par compte, déjà présente.
- À terme : protection anti-multi-comptes (Turnstile/CAPTCHA au signup et limitation par IP/appareil).
- Plafond de tokens de sortie plus bas après avoir mesuré les tickets réels, afin de réduire le coût maximal d'une réponse anormale.

## Scénario 2 — offre Fondateur limitée à 100 personnes

### Proposition recommandée

- Prix unique : **39 € à vie**.
- Limité aux **100 premiers utilisateurs**.
- 400 scans d'import initial, utilisables pendant les 30 à 45 premiers jours.
- Puis 25 scans par mois tant que BetTrack existe.
- Badge Fondateur et accès anticipé aux nouveautés pertinentes.

### Valeur utilisateur

- 400 scans initiaux permettent environ 1 200 paris, donc un véritable import d'historique.
- 25 scans mensuels représentent environ 75 paris par mois, ce qui couvre largement un usage personnel régulier.
- Le prix à vie crée une urgence honnête, car la quantité est réellement limitée.

### Économie indicative

| Indicateur | Estimation |
|---|---:|
| 100 fondateurs × 39 € | 3 900 € TTC de chiffre d'affaires brut |
| Recette avant IA/hébergement, par fondateur, si 39 € TTC | environ 31,67 € après TVA à 20 % et frais Stripe standard estimés |
| Coût IA la première année (400 initiaux + 25/mois) | environ 3,50 à 7 $ par fondateur actif |
| Coût IA annuel ensuite (25/mois) | environ 1,50 à 3 $ par fondateur actif |

Les taux de TVA, les frais Stripe réels, le statut juridique et les obligations comptables doivent être confirmés avec un professionnel avant la commercialisation.

### Risque à éviter

Ne pas annoncer « scans illimités à vie ». Une offre à vie doit avoir une enveloppe claire : crédits initiaux + quota mensuel raisonnable.

## Scénario 3 — offre Premium annuelle standard

### Proposition recommandée

- Prix : **29,99 € / an**.
- 400 scans d'import initial, valables 30 à 45 jours après l'abonnement.
- 50 scans par mois ensuite.
- Bankrolls, statistiques et saisie manuelle sans restrictions artificielles.

### Lecture économique

- 50 scans mensuels correspondent à environ 150 paris importés par mois.
- Première année : environ 1 000 scans au maximum (400 + 12 × 50), soit approximativement 5 à 10 $ d'IA dans l'usage normal.
- Les utilisateurs les plus actifs restent rentables avec une marge plus saine qu'à 9,99 € / an.

### Variante plus généreuse

- 29,99 € / an avec 100 scans par mois.
- À réserver si les données de l'admin confirment un coût moyen bas et une consommation réelle bien inférieure aux plafonds.

## Scénario 4 — crédits à l'unité ou packs d'import

Cette option peut compléter un abonnement, sans frustrer les gros importeurs.

| Pack possible | Usage | Intérêt |
|---|---|---|
| 100 scans | Import ponctuel | Permet de dépasser un quota sans changer d'offre |
| 300 scans | Historique important | Adapté à environ 900 paris |
| Import historique asynchrone | Gros volume | Peut plus tard passer par l'API Batch Claude, avec une remise de 50 % sur les tokens |

L'import asynchrone est une amélioration future : il ne convient pas encore au parcours actuel, qui affiche immédiatement les paris extraits pour validation.

## Scénario 5 — 9,99 € / an

### Possible uniquement avec une enveloppe stricte

Une offre à 9,99 € / an peut exister comme offre promotionnelle ou ultra-basique, mais pas avec 500 scans par mois.

Exemple viable :

- 100 à 150 scans par an au total ; ou
- 100 scans initiaux + 10 scans mensuels ; ou
- accès sans scan IA, avec saisie manuelle et statistiques uniquement.

Cette offre est utile pour convertir les utilisateurs très sensibles au prix, mais ne doit pas être l'offre qui supporte les gros imports.

## Comparaison synthétique proposée

| Offre | Prix | Import initial | Rythme ensuite | Positionnement |
|---|---:|---:|---:|---|
| Gratuit | 0 € | 20 scans à vie | 0 | Tester l'IA, puis saisie manuelle |
| Fondateur | 39 € à vie | 400 scans | 25/mois | 100 premiers, soutien au lancement |
| Premium | 29,99 €/an | 400 scans | 50/mois | Offre principale |
| Pack additionnel | à définir | 100 ou 300 scans | n/a | Gros import exceptionnel |

## Décisions à prendre plus tard

1. Valider ou ajuster les nombres : 20 / 400 / 25 / 50 scans.
2. Confirmer que 39 € est affiché TTC et définir précisément les 100 places Fondateur.
3. Choisir la durée de validité de l'import initial : 30 ou 45 jours.
4. Décider si les crédits d'import non utilisés expirent ou non.
5. Définir le tarif des packs de scans additionnels.
6. Définir les fonctionnalités non liées à l'IA qui distinguent Premium : davantage de bankrolls, exports avancés, statistiques, alertes, etc.
7. Utiliser une ou deux semaines de données de l'admin pour mesurer le coût moyen réel avant de publier les tarifs publiquement.

## Évolutions techniques nécessaires quand la décision sera prise

- Remplacer le simple plan `FREE` / `PREMIUM` par `FREE` / `FOUNDER` / `PREMIUM`.
- Créer des compteurs distincts : crédits gratuits à vie, crédits d'import initial, quota mensuel.
- Adapter le webhook Stripe pour attribuer le bon plan et les crédits d'import.
- Afficher les crédits restants et les règles de l'offre dans le compte utilisateur.
- Ajouter les protections anti-abus d'inscription avant une campagne gratuite large.

## Recommandation immédiate

Continuer à finir et tester le produit. Ne pas ouvrir les inscriptions publiques avec le quota temporaire actuel de 500 scans mensuels. Utiliser l'admin pour mesurer le coût réel, puis implémenter le modèle de crédits quand la grille d'offres sera validée.
