import { describe, expect, it } from "vitest";
import { rulesForTestedProfile } from "./bookmaker-profile";
import { buildExtractionPrompt } from "./extraction-prompt";

describe("bookmaker scan profile rules", () => {
  it("injects bookmaker rules only for a TESTED profile", () => {
    const validating = rulesForTestedProfile({ supportStatus: "VALIDATING", rules: "STAKE_ONLY" });
    const tested = rulesForTestedProfile({ supportStatus: "TESTED", rules: "STAKE_ONLY" });
    expect(validating).toBeNull();
    expect(tested).toBe("STAKE_ONLY");
    expect(buildExtractionPrompt(undefined, { bookmaker: "Stake", bookmakerRules: validating })).not.toContain("STAKE_ONLY");
    expect(buildExtractionPrompt(undefined, { bookmaker: "Stake", bookmakerRules: tested })).toContain("STAKE_ONLY");
  });

  it("does not let the bankroll context force a bookmaker detection", () => {
    const prompt = buildExtractionPrompt(undefined, { bookmaker: "Betclic", bookmakerRules: null });
    expect(prompt).toContain("Ne déduis jamais le bookmaker depuis la bankroll fournie.");
    expect(prompt).toContain("nom, son logo ou une marque textuelle propre à ce bookmaker");
    expect(prompt).toContain("La palette, la mise en page, la couleur des cotes");
    expect(prompt).toContain("La mention générique « Pari n° » est uniquement une référence de ticket");
    expect(prompt).toContain("N'invente notamment jamais « Pariuret », « Pariubet »");
  });

  it("keeps an available cashout offer as a pending bet", () => {
    const prompt = buildExtractionPrompt();
    expect(prompt).toContain('Un bouton ou une offre "Cashout 0,70 €" visible sur un ticket "En cours"');
    expect(prompt).toContain('garde "result": "En attente" et "cashOutAmount": null');
    expect(prompt).toContain("Ce statut final explicite est prioritaire sur le statut d'une sélection individuelle.");
  });

  it("classifies a same-sport accumulator with the shared sport taxonomy", () => {
    const prompt = buildExtractionPrompt();
    expect(prompt).toContain('un combiné de tennis');
    expect(prompt).toContain('utilise "betType": "Combiné"');
    expect(prompt).toContain('"sport": "Autre sport", "betType": "Autre"');
  });

  it("does not confuse Unibet tennis head-to-head tickets with golf", () => {
    const prompt = buildExtractionPrompt();
    expect(prompt).toContain("« Face à Face - Match »");
    expect(prompt).toContain("Ne confonds jamais la balle de tennis jaune avec une balle de golf.");
    expect(prompt).toContain("Utilise Golf uniquement si des indices textuels propres au golf sont visibles");
  });

  it("settles completed Unibet cards from the visible thumb and gains pair", () => {
    const prompt = buildExtractionPrompt();
    expect(prompt).toContain("un pouce vert accompagné d'un montant « Gains » strictement positif");
    expect(prompt).toContain("un pouce rouge accompagné de « Gains 0,00 € »");
    expect(prompt).toContain("ne les classe jamais \"En attente\"");
    expect(prompt).toContain("sans pouce rouge visible, ne suffit toujours pas à conclure Perdu");
  });

  it("copies the Unibet footer before converting its DD-MM-YY date", () => {
    const prompt = buildExtractionPrompt();
    expect(prompt).toContain('"dateText": "texte exact de la date visible sur le ticket');
    expect(prompt).toContain("obligatoirement JOUR-MOIS-ANNÉE");
    expect(prompt).toContain('"date": "2026-09-05", jamais "2026-05-09"');
    expect(prompt).toContain("contrôlée par le serveur à partir de \"dateText\"");
  });

  it("keeps an Unibet boost exception opt-in until its profile is TESTED", () => {
    const unibetRule = "Unibet : Cotes Boostées avec une cote A -> B visible permet boosted=true.";
    const validating = rulesForTestedProfile({ supportStatus: "VALIDATING", rules: unibetRule });
    const tested = rulesForTestedProfile({ supportStatus: "TESTED", rules: unibetRule });

    expect(buildExtractionPrompt(undefined, { bookmaker: "Unibet", bookmakerRules: validating })).not.toContain(unibetRule);
    expect(buildExtractionPrompt(undefined, { bookmaker: "Unibet", bookmakerRules: tested })).toContain(unibetRule);
    expect(buildExtractionPrompt()).toContain("Une exception ne peut venir que de règles spécifiques déjà fournies par un profil bookmaker TESTED");
  });

  it("keeps the Bet365 credit rule opt-in until its profile is TESTED", () => {
    const bet365Rule = "Bet Crédits explicitement visible : freebet=true.";
    const validating = rulesForTestedProfile({ supportStatus: "VALIDATING", rules: bet365Rule });
    const tested = rulesForTestedProfile({ supportStatus: "TESTED", rules: bet365Rule });

    expect(buildExtractionPrompt(undefined, { bookmaker: "Bet365", bookmakerRules: validating })).not.toContain(bet365Rule);
    expect(buildExtractionPrompt(undefined, { bookmaker: "Bet365", bookmakerRules: tested })).toContain(bet365Rule);
    expect(buildExtractionPrompt()).toContain("ou si une règle spécifique d'un profil bookmaker TESTED fourni ci-dessus désigne explicitement un équivalent");
  });
});
