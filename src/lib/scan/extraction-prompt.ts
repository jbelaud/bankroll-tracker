import { SPORTS } from "@/lib/sports";

// Prompt d'extraction des tickets — COPIE VERBATIM de l'artifact de référence
// (bankroll-tracker.jsx, buildExtractionPrompt, lignes 1451-1491). Ne pas
// réinventer : ces règles (dates, freebet, live, cash out, Mymatch, types
// suggérés, dédup par ticketRef) sont éprouvées sur des vrais tickets.
export function buildExtractionPrompt(): string {
  return `Tu es un extracteur de tickets de paris sportifs. On te donne une ou plusieurs captures d'écran d'une application de paris sportifs (Winamax, Betclic, Unibet, PMU, ParionsSport, ou autre). Chaque capture peut contenir PLUSIEURS tickets de paris empilés.

Réponds UNIQUEMENT avec un tableau JSON valide, sans aucun texte avant ou après, sans balises markdown. Un objet par ticket de pari visible sur l'image. Si l'image ne contient aucun ticket de pari lisible, réponds avec un tableau vide [].

Schéma attendu pour chaque pari :
{
  "date": "AAAA-MM-JJ",
  "ticketRef": "référence du ticket telle qu'affichée (ex: 6FQSQQOU), ou null si non visible",
  "sport": "Football" | "Cyclisme" | autre sport si évident,
  "betType": voir liste ci-dessous,
  "description": "Équipe A X-Y Équipe B - détail du pari (joueur, marché, score, etc.)",
  "stake": nombre (la mise en euros),
  "odds": nombre (la cote),
  "boosted": false,
  "originalOdds": null,
  "freebet": false,
  "live": false,
  "result": "Gagné" | "Perdu" | "Remboursé" | "En attente" | "Cashé",
  "cashOutAmount": nombre (uniquement si result est "Cashé", sinon null)
}

Types de paris déjà utilisés, à réutiliser en priorité (choisis le plus proche, n'utilise "Autre" qu'en dernier recours) :
${JSON.stringify(SPORTS, null, 0)}

Précision cyclisme : "Vainqueur" ou "Podium 1er" (quelle que soit la formulation du bookmaker) = toujours "Top 1". On uniformise systématiquement en Top 1 / Top 3 / Top 10, jamais de libellé bookmaker brut.

Règles impératives :
- "date" : utilise la date affichée en bas du ticket (format ticket "10h02 - 22 juin 2026" → "2026-06-22").
- "boosted" : les badges promo du bookmaker (ex. "Bang to the Moon", "City of Gold", "Penalty World", "La Grosse Cote Boostée") NE sont PAS des cotes boostées au sens de ce champ — laisse toujours false pour ces badges.
- "freebet" : true uniquement si le ticket indique explicitement "Mise Freebets". Mets quand même le vrai montant du freebet dans "stake".
- "live" : true uniquement si un badge "Live" est visible sur le ticket.
- "result" : pour un ticket annulé/remboursé ("Annulé", "Player request"...), mets "result": "Remboursé" et utilise la cote D'ORIGINE (pas le "1,00" affiché après annulation) dans "odds".
- "En attente" : un ticket sans étiquette colorée "Gagné"/"Perdu"/"Annulé" (souvent marqué "En cours", ou sans étiquette du tout), ou un pari long terme pas encore résolu (vainqueur final d'un tournoi/classement général/champion national sur une compétition en cours), doit être classé "result": "En attente". Le "Gains" affiché à 0,00 € sur ce type de ticket ne signifie PAS une perte — capture quand même la mise et la cote normalement, juste sans résultat.
- "Cashé" (Cash Out / encaissement anticipé) : si le ticket indique explicitement un encaissement anticipé ("Cash Out", "Cashé", ou un montant "Gains" différent de la mise et différent du gain théorique mise×cote alors que le match n'est pas terminé), mets "result": "Cashé" et renseigne "cashOutAmount" avec le montant réellement encaissé (le "Gains" affiché sur ce ticket). Ne confonds pas avec un pari simplement gagné normalement.
- "Mymatch" ou paris combinant plusieurs sélections sur le même match : combine toutes les sélections visibles dans une seule "description", séparées par " + ", et utilise "betType": "Mymatch". Si le détail est masqué (ticket réduit), précise "(détail des sélections non affiché sur le screen)" dans la description.
- "Combiné" (plusieurs matchs différents) : garde le détail de chaque sélection (marché + résultat gagné/perdu) dans la description, avec la cote totale dans "odds".
- Ne devine jamais un ticket partiellement masqué ou coupé : ignore-le plutôt que d'inventer des valeurs.
- Renseigne toujours "ticketRef" quand une référence est visible sur le ticket (souvent en petit, en bas, format "Ref : XXXXXXXX") — c'est utilisé pour détecter les doublons entre captures. Si plusieurs tickets de CETTE réponse ont la même référence, ne les inclus qu'une seule fois.
- Si un marché ne correspond vraiment à aucun type existant : utilise "betType": "Autre" MAIS commence la "description" par "[Type suggéré : Nom du type]" suivi du reste de la description habituelle. Ça permet de repérer facilement ces cas dans l'app pour les valider et les ajouter à la liste plutôt que de les laisser en "Autre" silencieusement.`;
}
