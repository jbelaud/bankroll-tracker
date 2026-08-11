import { SPORTS } from "@/lib/sports";
import type { Taxonomy } from "@/lib/taxonomy";

// Prompt d'extraction des tickets — COPIE VERBATIM de l'artifact de référence
// (bankroll-tracker.jsx, buildExtractionPrompt, lignes 1451-1491). Ne pas
// réinventer : ces règles (dates, freebet, live, cash out, Mymatch, types
// suggérés, dédup par ticketRef) sont éprouvées sur des vrais tickets.
export function buildExtractionPrompt(
  taxonomy: Taxonomy = SPORTS,
  context?: { bookmaker?: string; bookmakerRules?: string | null }
): string {
  return `Tu es un extracteur de tickets de paris sportifs. On te donne une ou plusieurs captures d'écran d'une application de paris sportifs (Winamax, Betclic, Unibet, PMU, ParionsSport, ou autre). Chaque capture peut contenir PLUSIEURS tickets de paris empilés.

Contexte fourni par l'utilisateur : la bankroll sélectionnée utilise ${context?.bookmaker ?? "un bookmaker inconnu"}. C'est un indice, pas une certitude : ne l'affirme jamais si la capture ne le confirme pas et continue l'extraction même si elle vient d'un autre bookmaker.
${context?.bookmakerRules ? `Règles validées par l'équipe BetTrack pour ce bookmaker :\n${context.bookmakerRules}\n` : ""}

Réponds UNIQUEMENT avec un tableau JSON valide, sans aucun texte avant ou après, sans balises markdown. Un objet par ticket de pari visible sur l'image. Si l'image ne contient aucun ticket de pari lisible, réponds avec un tableau vide [].

Schéma attendu pour chaque pari :
{
  "date": "AAAA-MM-JJ",
  "ticketRef": "référence du ticket telle qu'affichée (ex: 6FQSQQOU), ou null si non visible",
  "sport": "Football" | "Cyclisme" | autre sport si évident,
  "betType": voir liste ci-dessous,
  "description": "sélection jouée et affiche (ex: Match nul — Mexique - Équateur)",
  "eventResult": "score/résultat final de l'événement (ex: Mexique 2 - 0 Équateur), ou null si non affiché",
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
${JSON.stringify(taxonomy, null, 0)}

Précision cyclisme : "Vainqueur" ou "Podium 1er" (quelle que soit la formulation du bookmaker) = toujours "Top 1". On uniformise systématiquement en Top 1 / Top 3 / Top 10, jamais de libellé bookmaker brut.

Règles impératives :
- "date" : utilise la date affichée en bas du ticket (format ticket "10h02 - 22 juin 2026" → "2026-06-22").
- "sport" : déduis-le d'abord de la compétition, des participants et du contexte de l'événement, JAMAIS du type de pari, de la cote ou du nom d'une promotion. Une promotion bookmaker n'est jamais une information sportive. Exemples : Afrique du Sud - Canada en rugby doit avoir "sport": "Rugby", même avec un badge « La Grosse Cote Boostée » ; un coureur, une étape ou un classement cycliste doit avoir "sport": "Cyclisme".
- CONTRÔLE FINAL OBLIGATOIRE avant chaque objet JSON : choisis ensuite "betType" dans la liste rattachée à CE sport dans la taxonomie ci-dessus dès qu'il existe. Ne mélange jamais deux listes : "Buteur", "Passeur décisif", "But sur penalty" et "Score exact" sont du Football, jamais du Cyclisme ; "Top 1", "Top 3", "Top 10", "Vainqueur d'étape" et "Classement général" sont du Cyclisme, jamais du Football. Si le sport ou le marché est réellement nouveau, conserve le sport exact et propose un nom de sport/type court, générique et cohérent en français. Ce nouveau couple sera ajouté uniquement à la liste personnelle de cet utilisateur après qu'il l'aura validé dans l'app. Ne change jamais le sport juste pour faire correspondre un type de pari.
- "description" et "eventResult" sont STRICTEMENT distincts, pour TOUS les sports : "description" contient uniquement l'intitulé de la sélection jouée et les participants. Ne recopie jamais le résultat final de l'événement dans cette description. Mets le résultat réellement affiché dans "eventResult" avec le format adapté au sport : score pour football/rugby/basket, score en sets pour tennis, classement/temps pour cyclisme. Exemple football : pari « Match nul » sur Mexique - Équateur terminé 2-0 → "description": "Match nul — Mexique - Équateur", "eventResult": "Mexique 2 - 0 Équateur". Pour un pari « Score exact », conserve le score PRONOSTIQUÉ dans la description, mais place le score FINAL réellement affiché dans "eventResult". Si le résultat de l'événement n'est pas clairement visible ou si le pari est en attente, mets "eventResult": null.
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
- Si un marché ne correspond vraiment à aucun type existant mais qu'il est lisible : renseigne directement un "betType" court et explicite plutôt que "Autre" (par exemple "Nombre de fautes"). Utilise "Autre" seulement si le marché est trop vague ou illisible.`;
}
