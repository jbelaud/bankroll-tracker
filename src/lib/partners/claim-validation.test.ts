import { describe, expect, it } from "vitest";
import { parseClaimSubmission, parseClaimReview } from "./claim-validation";
import { partnerRewardEmailContent } from "./reward-email-template";

function submission(overrides: Record<string, string> = {}) {
  const form = new FormData();
  for (const [key, value] of Object.entries({ partnerId: "winamax", bookmakerUsername: "MonPseudo", registrationDate: "2026-10-02", confirmed: "on", ...overrides })) form.set(key, value);
  return form;
}

describe("déclaration du parrainage bookmaker", () => {
  it("ne retient aucun montant, bénéficiaire ou statut fourni par le navigateur", () => {
    const result = parseClaimSubmission(submission({ userId: "other-user", rewardQuantity: "999", status: "APPROVED", recipient: "attacker@example.test" }), new Date("2026-10-03T12:00:00Z"));
    expect(result).toMatchObject({ partnerId: "winamax", bookmakerUsername: "MonPseudo" });
    expect(result).not.toHaveProperty("userId");
    expect(result).not.toHaveProperty("rewardQuantity");
  });
  it.each<Record<string, string>>([{ registrationDate: "2026-02-30" }, { registrationDate: "2026-10-04" }, { bookmakerUsername: "x" }, { confirmed: "" }])("refuse les déclarations invalides", (input) => {
    expect(() => parseClaimSubmission(submission(input), new Date("2026-10-03T12:00:00Z"))).toThrow("invalidForm");
  });
  it("utilise la date française même à la limite d'un changement de jour", () => {
    expect(parseClaimSubmission(submission({ registrationDate: "2026-10-04" }), new Date("2026-10-03T22:30:00Z")).registrationDate.toISOString()).toBe("2026-10-04T00:00:00.000Z");
  });
  it.each(["REJECTED", "NEEDS_INFO"])("exige un motif pour %s", (decision) => {
    const form = new FormData();
    form.set("claimId", "claim"); form.set("revision", "1"); form.set("decision", decision);
    expect(() => parseClaimReview(form)).toThrow("invalidForm");
  });
  it("échappe le contenu de l'email et conserve les liens localisés", () => {
    const email = partnerRewardEmailContent({ partnerName: '<script>alert("x")</script>', quantity: 30, locale: "en", appUrl: "https://kalivoa.com" });
    expect(email.html).not.toContain("<script>");
    expect(email.html).toContain("&lt;script&gt;");
    expect(email.html).toContain("https://kalivoa.com/en/account/subscription");
    expect(email.text).toContain("30 permanent scans");
  });
});
