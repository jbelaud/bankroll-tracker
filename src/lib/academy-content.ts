import type { Locale } from "@/i18n/routing";

type AcademyContent = {
  hub: {
    title: string;
    description: string;
    eyebrow: string;
    introTitle: string;
    intro: string;
    articleLabel: string;
    articleSummary: string;
    tipsterLabel: string;
    tipsterSummary: string;
    readArticle: string;
  };
  article: {
    title: string;
    description: string;
    eyebrow: string;
    lead: string;
    whyTitle: string;
    why: string;
    checklistTitle: string;
    steps: { title: string; description: string }[];
    exampleTitle: string;
    example: string;
    imageAlt: string;
    imageCaption: string;
    troubleTitle: string;
    trouble: string;
    linksTitle: string;
    importLink: string;
    bankrollLink: string;
    faqLink: string;
    responsibleLink: string;
    backToAcademy: string;
  };
};

export const academyArticlePath = "/academie/verifier-ticket-pari-scan";

export const academyContent: Record<Locale, AcademyContent> = {
  fr: {
    hub: {
      title: "Académie Kalivoa",
      description: "Des méthodes concrètes pour tenir un historique de paris lisible et vérifier les informations avant de les enregistrer.",
      eyebrow: "Ressources pratiques",
      introTitle: "Commencer par un historique fiable",
      intro: "Chaque article répond à une question précise à partir d'un parcours réel dans Kalivoa. Les captures montrent ce que l'outil fait et les limites à garder en tête.",
      articleLabel: "Lecture d'un ticket",
      articleSummary: "Une checklist pour contrôler la sélection, la cote, la mise et le résultat après la lecture d'une capture.",
      tipsterLabel: "Transparence des tipsters",
      tipsterSummary: "Comment lire l'historique et les preuves d'une bankroll publique, avec le cas réel d'EGS Betting.",
      readArticle: "Lire l'article",
    },
    article: {
      title: "Quels champs vérifier après le scan d'un ticket de pari ?",
      description: "La checklist des champs à relire après la lecture d'une capture de ticket : sélection, cote, mise, résultat et date.",
      eyebrow: "Vérification d'un ticket",
      lead: "Avant d'enregistrer un pari lu sur une capture d'écran, comparez chaque ligne proposée avec le ticket d'origine. Vérifiez au minimum la sélection, la cote, la mise et le résultat. Contrôlez aussi la date, le type de pari, la bankroll et le statut freebet lorsqu'ils s'appliquent. Corrigez toute donnée incertaine avant de valider.",
      whyTitle: "Pourquoi relire les données détectées ?",
      why: "Une erreur de mise ou de résultat se retrouve ensuite dans le profit et les statistiques. Une cote incorrecte change le calcul d'un pari gagné. Une mauvaise sélection rend l'historique difficile à vérifier. La lecture par capture facilite la saisie, mais ne remplace pas ce contrôle.",
      checklistTitle: "La checklist avant de valider",
      steps: [
        { title: "Comptez les paris", description: "Comparez le nombre de paris proposés avec les tickets visibles. Pour un combiné, vérifiez chacune de ses sélections. Évitez de créer deux fois le même pari si plusieurs images montrent le même ticket." },
        { title: "Comparez l'événement et la sélection", description: "Vérifiez le sport, le marché, les participants et le choix réellement parié. Deux marchés sur un même événement ne sont pas interchangeables." },
        { title: "Contrôlez la cote et la mise", description: "Relisez les chiffres sur le ticket d'origine, y compris les virgules décimales. Une cote ou une mise mal lue fausse ensuite l'interprétation financière." },
        { title: "Vérifiez la date et le statut", description: "Renseignez les champs manquants. Pour un ticket réglé, comparez gagné, perdu, remboursé ou cash out avec ce que montre le ticket. Si l'information est illisible, ne la devinez pas." },
        { title: "Choisissez la bonne bankroll", description: "Associez le pari à la bonne bankroll et contrôlez le statut freebet. Une mise gratuite ne représente pas la même somme engagée qu'une mise en argent réel." },
        { title: "Relisez, puis enregistrez", description: "Après validation, ouvrez l'historique pour confirmer que le pari y figure une seule fois avec les champs corrigés." },
      ],
      exampleTitle: "Un exemple réel de relecture",
      example: "Cette capture fournie par Jeremy montre deux paris simples proposés à la vérification dans Kalivoa, l'un en tennis et l'autre en cyclisme. Les sélections, cotes, mises et résultats sont visibles. Les dates sont encore vides : c'est précisément un point à contrôler avant l'enregistrement.",
      imageAlt: "Écran réel de relecture de deux paris, en tennis et en cyclisme, dans Kalivoa",
      imageCaption: "Capture du 25 septembre 2026. Elle montre l'étape de relecture ; elle ne mesure ni la rapidité ni la précision globale de la lecture par capture. Aucun identifiant ni référence de ticket n'est visible.",
      troubleTitle: "Et si le ticket est mal lu ?",
      trouble: "Corrigez les champs proposés avant de sauvegarder. Si une sélection ou un statut reste incertain, revenez au ticket d'origine. Si la capture ne permet pas de trancher, préférez une saisie manuelle à une valeur supposée. Kalivoa ne demande aucun accès à votre compte bookmaker pour importer une capture.",
      linksTitle: "Pour poursuivre",
      importLink: "Comprendre l'import par capture",
      bankrollLink: "Suivre sa bankroll",
      faqLink: "Lire les questions fréquentes",
      responsibleLink: "Consulter les ressources de jeu responsable",
      backToAcademy: "Retour à l'Académie",
    },
  },
  en: {
    hub: {
      title: "Kalivoa Academy",
      description: "Practical ways to keep a clear betting history and check ticket details before saving them.",
      eyebrow: "Practical resources",
      introTitle: "Start with a reliable history",
      intro: "Each article answers a specific question using a real Kalivoa workflow. Screenshots show what the tool does and where review is still needed.",
      articleLabel: "Bet slip review",
      articleSummary: "A checklist for checking the selection, odds, stake and result after reading a screenshot.",
      tipsterLabel: "Tipster transparency",
      tipsterSummary: "How to read a public bankroll and its bet evidence, using EGS Betting's real example.",
      readArticle: "Read the article",
    },
    article: {
      title: "What should you check after scanning a betting slip?",
      description: "A checklist for reviewing a bet slip screenshot: selection, odds, stake, result and date.",
      eyebrow: "Bet slip review",
      lead: "Before saving a bet read from a screenshot, compare every proposed field with the original slip. Check at least the selection, odds, stake and result. Also review the date, bet type, bankroll and free-bet status when relevant. Correct anything uncertain before confirming.",
      whyTitle: "Why review extracted details?",
      why: "A wrong stake or result affects profit and statistics. Incorrect odds change the calculation for a winning bet. A wrong selection makes the history harder to verify. Screenshot reading helps with entry, but it does not replace your review.",
      checklistTitle: "Checklist before saving",
      steps: [
        { title: "Count the bets", description: "Compare the proposed bets with the slips visible in the image. For a multiple, review every selection. Avoid adding the same slip twice if it appears in more than one screenshot." },
        { title: "Compare the event and selection", description: "Check the sport, market, participants and actual pick. Two markets on the same event are not interchangeable." },
        { title: "Check odds and stake", description: "Read the numbers on the original slip, including decimal separators. Incorrect odds or stake make financial results harder to interpret." },
        { title: "Review date and status", description: "Fill in missing fields. For a settled slip, compare win, loss, refund or cash out with what the slip shows. Do not guess unreadable information." },
        { title: "Choose the right bankroll", description: "Assign the bet to the intended bankroll and review its free-bet status. A free stake is not the same as money actually risked." },
        { title: "Review once more, then save", description: "After confirming, open your history to ensure the bet appears once with the corrected details." },
      ],
      exampleTitle: "A real review screen",
      example: "This screenshot supplied by Jeremy shows two single bets proposed for review in Kalivoa, one for tennis and one for cycling. Selections, odds, stakes and results are visible. The dates are still blank: they need checking before saving.",
      imageAlt: "Real Kalivoa review screen showing a tennis bet and a cycling bet",
      imageCaption: "Screenshot supplied on September 25, 2026. It shows the review step, not a measured speed or overall reading accuracy. No ticket reference or account identifier is visible.",
      troubleTitle: "What if the slip was read incorrectly?",
      trouble: "Correct the proposed fields before saving. If a selection or result is uncertain, return to the original slip. If the image cannot settle the question, enter the bet manually instead of guessing. Kalivoa does not request bookmaker account access to import a screenshot.",
      linksTitle: "Keep exploring",
      importLink: "How screenshot import works",
      bankrollLink: "Track a bankroll",
      faqLink: "Read common questions",
      responsibleLink: "Responsible gambling resources",
      backToAcademy: "Back to the Academy",
    },
  },
};
