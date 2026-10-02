import React from "react";
import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { NextIntlClientProvider } from "next-intl";
import fr from "../../../messages/fr.json";
import en from "../../../messages/en.json";
import { getPublicPartners, getPartnerPreviews, PARTNER_CATALOGUE } from "@/lib/partners/catalogue";
import { PartnerCard, PartnersPage } from "./partners-page";

vi.mock("@/lib/growth/client", () => ({ trackPublicGrowthEvent: vi.fn() }));
vi.mock("@/i18n/navigation", () => ({ Link: ({ children, ...props }: React.ComponentProps<"a">) => <a {...props}>{children}</a> }));
const now = new Date("2026-10-02T12:00:00Z");
const render = (element: React.ReactNode, locale: "fr" | "en" = "fr") => renderToStaticMarkup(
  <NextIntlClientProvider locale={locale} messages={locale === "fr" ? fr : en} timeZone="Europe/Paris">{element}</NextIntlClientProvider>
);

describe("page publique partenaires", () => {
  it("rend les onglets accessibles, les conditions et les 30 scans permanents après validation", () => {
    const html = render(<PartnersPage partners={getPartnerPreviews(now)} />);
    expect(html).toContain("Les partenaires Kalivoa");
    expect(html.match(/role="tab"/g)).toHaveLength(2);
    expect(html).toContain("Conditions d’utilisation de Kalivoa");
    expect(html).toContain('href="/responsible-gambling"');
    expect(html).toContain("30 scans gratuits");
    expect(html).toContain("Scans permanents, sans expiration.");
    expect(html).toContain("Accéder à mes offres");
    expect(html).toContain('href="/partners"');
    for (const partner of PARTNER_CATALOGUE) {
      if (partner.href) expect(html).not.toContain(partner.href);
      if (partner.promoCode) expect(html).not.toContain(partner.promoCode);
    }
    expect(html).toContain("Collaboration à l’étude");
    expect(html).not.toContain("Aucun avantage en scans");
  });
  it("présente le code et le bonus Betclic avec un lien identifié et les conditions", () => {
    const partner = getPublicPartners(now).find((p) => p.id === "betclic")!;
    const html = render(<PartnerCard partner={partner} locale="fr" />);
    expect(html).toContain("10 € en paris gratuits");
    expect(html).toContain("ANDRJ5Q9");
    expect(html).toContain('rel="sponsored noopener noreferrer"');
    expect(html).toContain("premier dépôt");
    expect(html).toContain("Copier le code de parrainage Betclic");
  });
  it("n'offre pas d'action ou de code pour PMU ou BetCroissant", () => {
    for (const id of ["pmu", "betcroissant"]) {
      const html = render(<PartnerCard partner={getPublicPartners(now).find((p) => p.id === id)!} locale="fr" />);
      expect(html).not.toContain("Voir le parrainage");
      expect(html).not.toContain("Code de parrainage");
      expect(html).not.toContain("30 scans gratuits");
    }
  });
  it("rend les états vides et les textes anglais", () => {
    const html = render(<PartnersPage partners={[]} />, "en");
    expect(html).toContain("Kalivoa partners");
    expect(html).toContain("No offers available at the moment");
    expect(html).toContain("New collaborations in preparation");
  });
  it("affiche les conditions et la durée d'un avantage explicitement configuré", () => {
    const partner = getPublicPartners(now, [{ ...PARTNER_CATALOGUE[0], scanReward: { campaignId: "test-only", quantity: 3,
      expiresAfterDays: 7, stackable: true, conditions: { fr: "Après validation de l’action", en: "After action validation" } } }])[0];
    const html = render(<PartnerCard partner={partner} locale="fr" />);
    expect(html).toContain("3 scans gratuits");
    expect(html).toContain("Après validation de l’action");
    expect(html).toContain("Scans valables 7 jours");
  });
  it("affiche les 30 scans permanents et les conditions en anglais", () => {
    const partner = getPublicPartners(now).find((p) => p.id === "betclic")!;
    const html = render(<PartnerCard partner={partner} locale="en" />, "en");
    expect(html).toContain("30 free scans");
    expect(html).toContain("Permanent scans with no expiry.");
    expect(html).toContain("after Kalivoa validates the referral");
  });
});
