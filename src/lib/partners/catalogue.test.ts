import { describe, expect, it } from "vitest";
import { getPublicPartners, getPartnerPreviews, PARTNER_CATALOGUE, safePartnerUrl, type PartnerEntry } from "./catalogue";

const now = new Date("2026-10-02T12:00:00Z");
const base = PARTNER_CATALOGUE[0];
const entry = (values: Partial<PartnerEntry>): PartnerEntry => ({ ...base, ...values });

describe("catalogue public des partenaires", () => {
  it("ne sérialise aucun lien, code ou campagne dans la présentation publique", () => {
    const json = JSON.stringify(getPartnerPreviews(now));
    for (const partner of PARTNER_CATALOGUE) {
      if (partner.href) expect(json).not.toContain(partner.href);
      if (partner.promoCode) expect(json).not.toContain(partner.promoCode);
      if (partner.scanReward) expect(json).not.toContain(partner.scanReward.campaignId);
    }
    expect(json).not.toContain('"href"');
    expect(json).not.toContain('"conditionsHref"');
    expect(json).not.toContain('"promoCode"');
  });
  it("reprend les partenaires fournis et les 30 scans permanents approuvés pour chaque bookmaker", () => {
    const items = getPublicPartners(now);
    expect(items.filter((p) => p.section === "bookmakers").map((p) => p.id)).toEqual(["winamax", "betclic", "pmu", "unibet"]);
    expect(items.filter((p) => p.section === "tools").map((p) => p.id)).toEqual(["betcroissant"]);
    for (const partner of PARTNER_CATALOGUE.filter((p) => p.section === "bookmakers")) {
      expect(partner.scanReward).toMatchObject({ quantity: 30, expiresAfterDays: null, stackable: true });
      expect(partner.scanReward?.conditions.fr).toContain("Une attribution par compte Kalivoa et par offre");
    }
    expect(new Set(PARTNER_CATALOGUE.filter((p) => p.scanReward).map((p) => p.scanReward!.campaignId)).size).toBe(4);
    expect(items.filter((p) => p.scanReward).map((p) => p.id)).toEqual(["winamax", "betclic", "unibet"]);
    expect(items.find((p) => p.id === "betcroissant")?.scanReward).toBeUndefined();
    expect(items.find((p) => p.id === "betclic")?.href).toBe("https://betclic.onelink.me/2887093520/6c3132b8?af_sub5=ANDRJ5Q9");
    expect(items.find((p) => p.id === "winamax")?.promoCode).toBe("WITJ1Y");
  });
  it("garde BetCroissant en discussion et PMU en attente de conditions actuelles", () => {
    const items = getPublicPartners(now);
    expect(items.find((p) => p.id === "betcroissant")).toMatchObject({ status: "PREPARATION", href: undefined, promoCode: undefined, offer: undefined });
    expect(items.find((p) => p.id === "pmu")).toMatchObject({ status: "UNAVAILABLE", href: undefined, promoCode: undefined });
  });
  it("désactive les actions et récompenses à la fin d'une campagne", () => {
    const expiresAt = "2026-10-12T21:59:59.999Z";
    const catalogue = [entry({ offerExpiresAt: expiresAt, scanReward: { campaignId: "test", quantity: 3, expiresAfterDays: 7,
      conditions: { fr: "test", en: "test" }, stackable: true } })];
    expect(getPublicPartners(new Date("2026-10-12T21:59:59.998Z"), catalogue)[0].scanReward?.quantity).toBe(3);
    expect(getPublicPartners(new Date(expiresAt), catalogue)[0]).toMatchObject({ status: "UNAVAILABLE", href: undefined, promoCode: undefined, offer: undefined, scanReward: undefined });
    expect(getPublicPartners(new Date("2026-10-13T00:00:00Z")).find((p) => p.id === "unibet")?.href).toBeUndefined();
  });
  it("masque les archives, conserve l'ordre et traite une date invalide sans offre active", () => {
    const items = getPublicPartners(now, [entry({ id: "archive", status: "ARCHIVED" }), entry({ id: "second", order: 20 }),
      entry({ id: "featured", order: 30, featured: true }), entry({ id: "invalid", offerExpiresAt: "invalid" })]);
    expect(items.map((p) => p.id)).toEqual(["featured", "invalid", "second"]);
    expect(items[1].status).toBe("UNAVAILABLE");
  });
  it.each(["javascript:alert(1)", "http://example.com", "https://user:password@example.com", "not-a-url"])("refuse une URL d'action non sûre : %s", (url) => {
    expect(safePartnerUrl(url)).toBeUndefined();
  });
  it.each([0, -1, 1.5, 2_147_483_648])("masque une quantité de récompense invalide : %s", (quantity) => {
    const item = getPublicPartners(now, [entry({ scanReward: { campaignId: "test", quantity, expiresAfterDays: 7,
      stackable: true, conditions: { fr: "test", en: "test" } } })])[0];
    expect(item.scanReward).toBeUndefined();
  });
  it("masque les récompenses ayant une durée invalide", () => {
    expect(getPublicPartners(now, [entry({ scanReward: { campaignId: "test", quantity: 4, expiresAfterDays: -1,
      stackable: true, conditions: { fr: "test", en: "test" } } })])[0].scanReward).toBeUndefined();
  });
  it("retire les actions des offres non actives même si elles sont configurées", () => {
    for (const status of ["COMING_SOON", "PREPARATION", "UNAVAILABLE"] as const) {
      const item = getPublicPartners(now, [entry({ status })])[0];
      expect(item.href).toBeUndefined(); expect(item.promoCode).toBeUndefined();
    }
  });
});
