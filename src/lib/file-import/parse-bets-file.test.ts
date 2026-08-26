import { describe, expect, it } from "vitest";
import { parseBetsFileContent } from "./parse-bets-file";

describe("parseBetsFileContent", () => {
  it("importe un CSV français séparé par des points-virgules avec virgules décimales", () => {
    const parsed = parseBetsFileContent("bet-analytics.csv", [
      "Date;Sport;Marché;Sélection;Mise;Cote;Statut;Référence",
      '24/08/2026;Football;Résultat du match;"Paris, vainqueur";10,50;1,85;Gagné;BA-42',
    ].join("\n"));

    expect(parsed.format).toBe("CSV");
    expect(parsed.rows[0]).toMatchObject({
      sourceRow: 2,
      errors: [],
      bet: {
        date: "2026-08-24",
        sport: "Football",
        betType: "Résultat du match",
        description: "Paris, vainqueur",
        stake: 10.5,
        odds: 1.85,
        result: "GAGNE",
        ticketRef: "BA-42",
      },
    });
  });

  it("importe un export JSON imbriqué et ses alias anglais", () => {
    const parsed = parseBetsFileContent("history.json", JSON.stringify({
      history: [{
        placedAt: "2026-08-20T18:30:00Z",
        event: { sportName: "Tennis", name: "Sinner - Alcaraz" },
        marketName: "Vainqueur du match",
        wager: "25.00 EUR",
        decimalOdds: 2.1,
        outcome: "lost",
        slipId: "T-12",
        inPlay: true,
      }],
    }));

    expect(parsed.rows[0].bet).toMatchObject({
      date: "2026-08-20",
      sport: "Tennis",
      betType: "Vainqueur du match",
      description: "Sinner - Alcaraz",
      stake: 25,
      odds: 2.1,
      result: "PERDU",
      ticketRef: "T-12",
      live: true,
    });
  });

  it("accepte un TSV, les remboursements sans cote et les dates Excel", () => {
    const parsed = parseBetsFileContent("bets.tsv", [
      "date\tsport\ttype\tstake\todds\tstatus",
      "45500\tBasketball\tHandicap\t5\t\tvoid",
    ].join("\n"));

    expect(parsed.rows[0].errors).toEqual([]);
    expect(parsed.rows[0].bet).toMatchObject({
      date: "2024-07-27",
      odds: null,
      result: "REMBOURSE",
    });
  });

  it("signale précisément les lignes incomplètes sans bloquer les autres", () => {
    const parsed = parseBetsFileContent("bets.csv", [
      "date,stake,odds,result",
      "bad-date,10,2,won",
      "2026-08-22,20,1.5,won",
    ].join("\n"));

    expect(parsed.rows[0].bet).toBeNull();
    expect(parsed.rows[0].errors).toContain("Date absente ou invalide");
    expect(parsed.rows[1].bet).not.toBeNull();
  });

  it("gère les champs CSV multilignes et les guillemets échappés", () => {
    const parsed = parseBetsFileContent("bets.csv", 'date,stake,odds,description\n2026-08-22,10,2,"Paris dit ""combiné""\nsur deux lignes"');
    expect(parsed.rows[0].bet?.description).toBe('Paris dit "combiné"\nsur deux lignes');
  });

  it("signale les dates jour/mois ambiguës au lieu de les masquer", () => {
    const parsed = parseBetsFileContent("bets.csv", "date,stake,odds\n08/09/2026,10,2");
    expect(parsed.rows[0].bet?.date).toBe("2026-09-08");
    expect(parsed.rows[0].warnings).toContain("Date ambiguë interprétée au format jour/mois/année");
  });
});
