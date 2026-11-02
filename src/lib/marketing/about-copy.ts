import { COMPANY } from "@/lib/company";

/** Single source for the About page and its Markdown representation. */
export type AboutLocale = "fr" | "en";

export const aboutCopy = {
  fr: {
    metaTitle: "À propos de Kalivoa",
    metaDescription: "Qui édite Kalivoa, ce que l’application fait, ce qu’elle ne fait pas et comment contacter l’éditeur.",
    eyebrow: "À propos",
    title: "Kalivoa, un outil indépendant de suivi de bankroll",
    intro: "Kalivoa aide les parieurs sportifs à transformer des captures de tickets en historique structuré, puis à suivre leur bankroll, leur profit et leur ROI avec des indicateurs lisibles.",
    sections: [
      {
        title: "Ce que fait Kalivoa",
        body: "L’application lit les informations visibles sur une capture de ticket, les propose sous forme de paris structurés et laisse l’utilisateur les vérifier et les corriger avant tout enregistrement. Les paris validés alimentent un historique privé, des bankrolls et des statistiques. Les profils de lecture validés couvrent Winamax, Betclic, Unibet, Bet365 et PEC.bet.",
      },
      {
        title: "Ce que Kalivoa ne fait pas",
        body: "Kalivoa ne place aucun pari, ne fournit aucun conseil de pari et ne promet aucun gain. L’application ne demande jamais les identifiants de connexion d’un bookmaker. Le jeu est réservé aux adultes ; en cas de difficulté, des ressources d’aide sont indiquées sur la page Jeu responsable.",
      },
      {
        title: "Qui édite Kalivoa",
        body: `Kalivoa est édité par ${COMPANY.name}, société par actions simplifiée unipersonnelle (SASU) immatriculée sous le numéro ${COMPANY.commercialRegister}, dont le siège social est situé ${COMPANY.registeredAddress}. Le président est ${COMPANY.president}. Les mentions légales complètes sont disponibles sur la page dédiée.`,
      },
      {
        title: "Nous contacter",
        body: `Pour une question, un problème technique ou une demande concernant vos données, écrivez à ${COMPANY.publicEmail} ou utilisez l’aide intégrée à Mon compte. Les demandes d’export ou de suppression de données personnelles sont traitées à cette même adresse.`,
      },
    ],
    links: { contact: "Page Contact", legal: "Mentions légales", privacy: "Politique de confidentialité", home: "Accueil" },
  },
  en: {
    metaTitle: "About Kalivoa",
    metaDescription: "Who publishes Kalivoa, what the application does, what it does not do and how to contact the publisher.",
    eyebrow: "About",
    title: "Kalivoa, an independent bankroll-tracking tool",
    intro: "Kalivoa helps sports bettors turn betting-slip screenshots into a structured history, then follow their bankroll, profit and ROI with readable indicators.",
    sections: [
      {
        title: "What Kalivoa does",
        body: "The application reads the information visible on a betting-slip screenshot, proposes it as structured bets and lets the user review and correct it before anything is saved. Validated bets feed a private history, bankrolls and statistics. Validated reading profiles cover Winamax, Betclic, Unibet, Bet365 and PEC.bet.",
      },
      {
        title: "What Kalivoa does not do",
        body: "Kalivoa does not place bets, does not give betting advice and does not promise any winnings. The application never asks for a bookmaker login. Gambling is for adults only; if it becomes a problem, help resources are listed on the Responsible gambling page.",
      },
      {
        title: "Who publishes Kalivoa",
        body: `Kalivoa is published by ${COMPANY.name}, a French single-member simplified joint-stock company (SASU) registered under ${COMPANY.commercialRegister}, with its registered office at ${COMPANY.registeredAddress}. The president is ${COMPANY.president}. Full legal notices are available on the dedicated page.`,
      },
      {
        title: "Contact",
        body: `For a question, a technical issue or a request about your data, write to ${COMPANY.publicEmail} or use the built-in help in My account. Requests to export or delete personal data are handled at the same address.`,
      },
    ],
    links: { contact: "Contact page", legal: "Legal notice", privacy: "Privacy policy", home: "Home" },
  },
} as const;
