import type { Locale } from "@/i18n/routing";

export const academyTipsterPath = "/academie/verifier-paris-tipster";
export const tipsterBankrollSlug = "Gi4RdWxXhbHFOIJL";

type TipsterArticle = {
  title: string;
  description: string;
  eyebrow: string;
  lead: string;
  methodTitle: string;
  method: { title: string; body: string }[];
  exampleTitle: string;
  exampleIntro: string;
  observedAt: string;
  evidenceRows: { label: string; value: string }[];
  exampleConclusion: string;
  observationTitle: string;
  observation: string;
  limitsTitle: string;
  limits: string;
  sourceLabel: string;
  bankrollLink: string;
  trackingLink: string;
  responsibleLink: string;
  backToAcademy: string;
};

export const academyTipsterContent: Record<Locale, TipsterArticle> = {
  fr: {
    title: "Comment vérifier les paris publiés par un tipster ?",
    description: "Historique, preuve de chaque pari et statut de certification : comment lire une bankroll publique de tipster avec un exemple réel daté.",
    eyebrow: "Transparence des tipsters",
    lead: "Ouvrez la bankroll publique du tipster, puis lisez séparément les résultats, le niveau de preuve des paris et la période couverte. Un historique bénéficiaire ne prouve pas à lui seul que chaque ticket a été vérifié. Le journal de transparence permet de voir les scans et corrections associés à un pari.",
    methodTitle: "Les trois contrôles à faire",
    method: [
      { title: "Vérifier la période et le nombre de paris", body: "Regardez combien de paris sont visibles, combien sont terminés et sur quelle période ils ont été enregistrés. Une série courte ou un résultat ponctuel ne permet pas de déduire la performance future." },
      { title: "Lire le statut de preuve, pari par pari", body: "Ouvrez le journal de transparence. « Preuve reçue », « Preuve limitée » et « Certifié » ne signifient pas la même chose. Un ticket scanné avant l'événement puis son résultat confirmé par un second scan représente le cycle de preuve le plus complet." },
      { title: "Comparer l'historique au statut global", body: "Un ancien pari peut rester visible sans compter dans la certification, qui commence à la publication de la bankroll. Lisez le score et le niveau affichés, ainsi que les corrections visibles, sans les confondre avec le profit ou le ROI." },
    ],
    exampleTitle: "Exemple réel : la bankroll publique d'EGS Betting",
    exampleIntro: "Le 8 octobre 2026, nous avons consulté la page publique d'EGS Betting avec l'accord du tipster pour la citer. Voici les valeurs affichées à cet instant, et non des performances promises ou des chiffres actualisés en continu.",
    observedAt: "Relevé du 8 octobre 2026",
    evidenceRows: [
      { label: "Paris visibles", value: "26, dont 25 terminés et 1 en attente" },
      { label: "Certification Kalivoa", value: "10/100 · En observation" },
      { label: "Paris avec preuve complète", value: "0 %" },
      { label: "Volume suivi pour la certification", value: "2,5 unités" },
    ],
    exampleConclusion: "Le pari en cours du 8 octobre affichait « Preuve reçue » ; un pari terminé du 4 octobre affichait « Preuve limitée ». Ces mentions montrent pourquoi il faut ouvrir le détail des paris au lieu de résumer toute la bankroll par un seul chiffre.",
    observationTitle: "Pourquoi « En observation » alors que 25 paris sont terminés ?",
    observation: "Le total visible comprend des paris historiques. Le suivi de certification démarre à la publication de la bankroll et ne certifie pas rétroactivement les paris antérieurs. La règle actuellement déployée maintient le niveau global « En observation » tant que moins de 10 paris terminés sont éligibles depuis cette activation. Les 25 résultats visibles ne sont donc pas 25 preuves éligibles.",
    limitsTitle: "Ce que la certification prouve, et ses limites",
    limits: "Kalivoa qualifie les preuves associées aux paris publiés ; il ne vérifie pas le solde réel du compte bookmaker. Le score ne garantit pas qu'il soit impossible de tricher, ni que le tipster gagnera à l'avenir. Les montants réellement misés par le tipster restent privés : la page affiche ses mises et résultats en unités.",
    sourceLabel: "Voir la source et poursuivre",
    bankrollLink: "Ouvrir la bankroll publique d'EGS Betting",
    trackingLink: "Comprendre le suivi de bankroll",
    responsibleLink: "Consulter les ressources de jeu responsable",
    backToAcademy: "Retour à l'Académie",
  },
  en: {
    title: "How can you verify a tipster's published bets?",
    description: "Read a tipster's public bet history, per-bet evidence and certification status using a dated real-world example.",
    eyebrow: "Tipster transparency",
    lead: "Open the tipster's public bankroll, then review results, bet evidence and the time period separately. A profitable history alone does not show that every slip was verified. The transparency log shows the scans and corrections linked to an individual bet.",
    methodTitle: "Three checks to make",
    method: [
      { title: "Check the period and number of bets", body: "See how many bets are visible, how many have settled and when they were recorded. A short run or a single result cannot establish future performance." },
      { title: "Read the evidence status of each bet", body: "Open the transparency log. “Evidence received”, “Limited evidence” and “Certified” mean different things. A slip scanned before the event and a result confirmed by a second scan provide the most complete evidence cycle." },
      { title: "Compare the history with the overall status", body: "An older bet may remain visible without counting towards certification, which starts when the bankroll is published. Read the displayed score and level, and the visible corrections, separately from profit and ROI." },
    ],
    exampleTitle: "Real example: EGS Betting's public bankroll",
    exampleIntro: "On October 8, 2026, we reviewed EGS Betting's public page with the tipster's permission to cite it. These are the values displayed at that point in time, not a performance promise or live figures.",
    observedAt: "Observed October 8, 2026",
    evidenceRows: [
      { label: "Visible bets", value: "26, including 25 settled and 1 pending" },
      { label: "Kalivoa certification", value: "10/100 · Under observation" },
      { label: "Bets with complete evidence", value: "0%" },
      { label: "Volume tracked for certification", value: "2.5 units" },
    ],
    exampleConclusion: "The pending bet dated October 8 displayed “Evidence received”; a settled bet dated October 4 displayed “Limited evidence”. These labels show why it is useful to inspect individual bets instead of describing the whole bankroll with one number.",
    observationTitle: "Why “Under observation” if 25 bets are settled?",
    observation: "The visible total includes historical bets. Certification tracking begins when the bankroll is published and does not retroactively certify earlier bets. The currently deployed rule keeps the overall level “Under observation” until at least 10 settled bets are eligible since activation. The 25 visible results are therefore not 25 eligible proofs.",
    limitsTitle: "What certification shows, and its limits",
    limits: "Kalivoa rates the evidence attached to published bets; it does not verify the actual bookmaker account balance. The score cannot guarantee that cheating is impossible or that a tipster will profit in future. The tipster's real stake amounts remain private: the page displays stakes and results in units.",
    sourceLabel: "Read the source and continue",
    bankrollLink: "Open EGS Betting's public bankroll",
    trackingLink: "Understand bankroll tracking",
    responsibleLink: "Responsible gambling resources",
    backToAcademy: "Back to the Academy",
  },
};
