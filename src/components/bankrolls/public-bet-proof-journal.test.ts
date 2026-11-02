import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PublicBetProofJournal } from "./public-bet-proof-journal";

describe("public bet proof journal", () => {
  it("explains a single result scan without inventing a pre-event proof", () => {
    const html = renderToStaticMarkup(createElement(PublicBetProofJournal, {
      locale: "fr", proofStatus: "LIMITED", initialProofAt: null,
      initialProofBeforeEvent: null, resultProofAt: new Date("2026-09-17T21:00:00Z"), corrections: [],
    }));

    expect(html).toContain("Journal de transparence · 1 scan(s) · 0 correction(s)");
    expect(html).toContain("Capture du résultat enregistrée");
    expect(html).toContain("aucun scan initial avant l’événement n’est confirmé");
    expect(html).not.toContain("avant l’événement confirmé");
  });

  it("publishes proof dates and correction field names without private values or reason", () => {
    const html = renderToStaticMarkup(createElement(PublicBetProofJournal, {
      locale: "fr", proofStatus: "STRONG",
      initialProofAt: new Date("2026-09-17T18:26:20Z"), initialProofBeforeEvent: true,
      resultProofAt: new Date("2026-09-17T20:58:19Z"),
      corrections: [{
        kind: "DETAILS_EDITED", createdAt: new Date("2026-09-18T08:00:00Z"),
        before: { odds: 2.5, ticketRef: "PRIVATE-TICKET", referenceCapitalAtBet: 500 },
        after: { odds: 2.63, ticketRef: "PRIVATE-TICKET-NEW", referenceCapitalAtBet: 850, proofReviewVerified: true },
      }],
    }));

    expect(html).toContain("Journal de transparence · 2 scan(s) · 1 correction(s)");
    expect(html).toContain("avant l’événement confirmé");
    expect(html).toContain("Preuves du scan vérifiées");
    expect(html).toContain("cote");
    expect(html).not.toContain("PRIVATE-TICKET");
    expect(html).not.toContain("referenceCapitalAtBet");
    expect(html).not.toContain("850");
  });
});
