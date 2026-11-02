import type { Locale } from "@/i18n/routing";

export const academyCombinedPath = "/academie/suivre-pari-combine";

type CombinedContent = {
  title: string; description: string; lead: string; category: string;
  sections: { title: string; paragraphs: string[] }[];
  evidenceTitle: string; evidenceIntro: string; evidenceRows: { label: string; value: string }[];
  evidenceNote: string; mistakesTitle: string; mistakes: string[];
  nextTitle: string; reviewLink: string; trackingLink: string; responsibleLink: string;
};

export const academyCombinedContent: Record<Locale, CombinedContent> = {
  fr: {
    title: "Comment suivre un pari combiné sans compter deux fois la mise ?",
    description: "Enregistrez un combiné avec une seule mise, ses sélections et sa cote totale. Exemple réel de deux sélections dans l’historique Kalivoa.",
    category: "Tenir son historique",
    lead: "Enregistrez le combiné une seule fois, avec la mise du ticket et sa cote totale. Rattachez toutes ses sélections à ce pari. Deux sélections dans un combiné ne sont pas deux paris simples : les saisir avec la mise entière sur chacune doublerait artificiellement le montant engagé dans votre suivi.",
    sections: [
      { title: "Qu’est-ce qui constitue un seul pari ?", paragraphs: ["Le ticket combiné réunit plusieurs sélections sous une mise commune. Dans un historique, la ligne principale porte cette mise, la cote totale et le résultat global. Le détail des sélections permet de comprendre ce qui a été joué, sans ajouter une deuxième mise.", "Si vous avez aussi placé un pari simple sur l’une des sélections, il s’agit d’un autre ticket avec sa propre mise. Vous pouvez alors conserver deux lignes : une pour ce simple et une pour le combiné. Le nombre de lignes suit les tickets réellement joués, pas le nombre de choix sportifs."] },
      { title: "Comment le vérifier avant l’enregistrement ?", paragraphs: ["Commencez par compter les sélections sur le ticket original. Comparez ensuite chaque événement, marché et choix avec le détail proposé dans Kalivoa. Si une sélection manque ou si un nom est mal lu, corrigez-le avant de valider.", "Reportez la mise commune dans le champ du pari. Vérifiez séparément les cotes des sélections et la cote totale affichée par le bookmaker. Utilisez cette dernière pour le ticket : des arrondis, une cote boostée ou les règles du bookmaker peuvent rendre un recalcul à partir des cotes visibles différent du total affiché.", "Après un import par capture, la relecture reste obligatoire. Kalivoa ne demande aucun accès au compte bookmaker : la vérification se fait à partir de votre ticket et des champs proposés."] },
      { title: "Quel résultat enregistrer si une sélection perd ?", paragraphs: ["Reprenez le statut global du ticket tel qu’il est réglé par le bookmaker. Ne déduisez pas le résultat financier du seul résultat d’un match : une sélection annulée, un remboursement, un cash out ou une offre particulière peuvent modifier le règlement.", "Si le ticket n’est pas encore réglé, conservez son état en attente. Si son résultat est illisible, vérifiez la source avant de choisir un statut. Le détail des sélections documente le pari ; le résultat de la ligne correspond au ticket complet."] },
      { title: "Comment repérer un doublon dans l’historique ?", paragraphs: ["Après l’enregistrement, recherchez le combiné par date et par événement, puis ouvrez ses sélections. Vérifiez qu’une seule ligne porte la mise du ticket. Les mêmes participants peuvent apparaître sur d’autres tickets légitimes : contrôlez aussi l’heure, le marché et la mise avant de conclure à un doublon.", "Si vous utilisez plusieurs captures d’un même ticket pour montrer toutes ses sélections, comparez les propositions avant de les enregistrer. Des vues complémentaires ne doivent pas devenir plusieurs paris identiques. En cas de doublon confirmé, corrigez l’historique avant d’interpréter les statistiques."] },
    ],
    evidenceTitle: "Un cas réel : deux sélections, une mise de 11,25 €",
    evidenceIntro: "Les captures transmises par Jeremy le 25 septembre 2026 montrent un combiné de tennis et son enregistrement dans Kalivoa. Voici les informations relevées sur ces deux écrans, sans reproduire les références des tickets.",
    evidenceRows: [
      { label: "Sélections du ticket", value: "Vainqueur M. Stoiana et vainqueur J. Jovic" },
      { label: "Cotes individuelles affichées", value: "1,47 et 1,31" },
      { label: "Cote totale affichée", value: "1,93" },
      { label: "Mise commune", value: "11,25 €" },
      { label: "Structure observée dans Kalivoa", value: "Une ligne de pari, avec deux sélections dépliables" },
    ],
    evidenceNote: "Source : ticket original et écran d’historique fournis le 25 septembre 2026, pour un pari daté du 17 septembre. Ce relevé illustre la structure d’un combiné. Il ne constitue pas une mesure de précision de l’OCR ni un exemple de calcul de profit.",
    mistakesTitle: "Les erreurs qui faussent le suivi",
    mistakes: ["Créer un pari simple par sélection en répétant la mise complète du combiné.", "Enregistrer deux fois le même ticket à partir de captures qui se recoupent.", "Remplacer la cote totale réglée par une multiplication de cotes arrondies.", "Confondre le résultat d’une sélection avec le règlement final du ticket."],
    nextTitle: "Pour poursuivre", reviewLink: "Relire tous les champs d’un ticket après un scan", trackingLink: "Comprendre le suivi de bankroll", responsibleLink: "Consulter les ressources de jeu responsable",
  },
  en: {
    title: "How do you track an accumulator without counting its stake twice?",
    description: "Record an accumulator with one stake, its selections and total odds. A real two-selection example from Kalivoa’s betting history.",
    category: "Keep your betting history",
    lead: "Record the accumulator once, with the slip’s stake and total odds. Attach every selection to that bet. Two selections within one accumulator are not two singles: entering the full stake against each would artificially double the amount staked in your records.",
    sections: [
      { title: "What counts as one bet?", paragraphs: ["An accumulator combines several selections under one shared stake. The main history entry holds that stake, the total odds and the overall result. Its selection details explain what you backed without adding another stake.", "If you also placed a single on one of those selections, that is a separate slip with its own stake. Keep one entry for the single and another for the accumulator. The number of entries follows actual slips, not the number of sporting picks."] },
      { title: "What should you check before saving?", paragraphs: ["Start by counting the selections on the original slip. Compare each event, market and pick with the proposed details in Kalivoa. Correct missing selections or incorrectly read names before confirming.", "Enter the shared stake at bet level. Check each selection’s odds separately from the bookmaker’s displayed total odds. Use the displayed total for the slip: rounding, boosted odds or bookmaker rules can make a calculation from visible selection odds differ from that total.", "Screenshot imports still require review. Kalivoa does not request bookmaker account access: compare the proposed fields with your original slip."] },
      { title: "Which result should you record if one selection loses?", paragraphs: ["Use the overall slip status settled by the bookmaker. Do not infer its financial result from one match alone: void selections, refunds, cash outs or special offers can affect settlement.", "Keep an unsettled slip pending. If its result is unreadable, check the source before selecting a status. Selection details document the bet; the history entry’s result applies to the complete slip."] },
      { title: "How do you spot a duplicate in your history?", paragraphs: ["After saving, find the accumulator by date and event, then expand its selections. Make sure only one entry carries its stake. The same participants can appear on other legitimate slips: compare time, market and stake before deciding an entry is a duplicate.", "If several screenshots show different parts of one slip, compare the proposed bets before saving them. Complementary views should not turn into duplicate bets. Correct confirmed duplicates before interpreting your statistics."] },
    ],
    evidenceTitle: "A real example: two selections and one €11.25 stake",
    evidenceIntro: "Screenshots supplied by Jeremy on September 25, 2026 show a tennis accumulator and its Kalivoa history entry. The following details were recorded from those two screens without reproducing ticket references.",
    evidenceRows: [
      { label: "Slip selections", value: "M. Stoiana to win and J. Jovic to win" },
      { label: "Displayed selection odds", value: "1.47 and 1.31" },
      { label: "Displayed total odds", value: "1.93" },
      { label: "Shared stake", value: "€11.25" },
      { label: "Observed Kalivoa structure", value: "One bet entry with two expandable selections" },
    ],
    evidenceNote: "Source: original slip and Kalivoa history screenshot supplied on September 25, 2026, for a bet dated September 17. These observations illustrate accumulator structure. They do not measure OCR accuracy or provide a profit calculation example.",
    mistakesTitle: "Mistakes that distort your records",
    mistakes: ["Creating a single for every selection and repeating the accumulator’s full stake.", "Saving the same slip twice from overlapping screenshots.", "Replacing the settled total odds with a multiplication of rounded selection odds.", "Confusing a selection’s result with the final settlement of the slip."],
    nextTitle: "Keep exploring", reviewLink: "Review every slip field after scanning", trackingLink: "Understand bankroll tracking", responsibleLink: "Responsible gambling resources",
  },
};
