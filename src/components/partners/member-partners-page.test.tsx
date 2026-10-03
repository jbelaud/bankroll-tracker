import React from "react";
import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { NextIntlClientProvider } from "next-intl";
import fr from "../../../messages/fr.json";
import en from "../../../messages/en.json";
import { getPublicPartners } from "@/lib/partners/catalogue";
import { MemberPartnersPage } from "./member-partners-page";
vi.mock("@/lib/growth/client", () => ({ trackPublicGrowthEvent: vi.fn() }));
vi.mock("@/i18n/navigation", () => ({ Link: ({ children, ...props }: React.ComponentProps<"a">) => <a {...props}>{children}</a>, useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/lib/actions/partner-referrals", () => ({ declarePartnerReferral: vi.fn() }));

describe("espace partenaires connecté", () => {
  it.each(["fr", "en"] as const)("affiche les offres, les scans permanents et la validation en préparation en %s", (locale) => {
    const html = renderToStaticMarkup(<NextIntlClientProvider locale={locale} messages={locale === "fr" ? fr : en} timeZone="Europe/Paris"><MemberPartnersPage partners={getPublicPartners(new Date("2026-10-02T12:00:00Z"))} /></NextIntlClientProvider>);
    expect(html).toContain("WITJ1Y");
    expect(html).toContain("ANDRJ5Q9");
    expect(html).toContain('href="https://www.winamax.fr/parrain?code=WITJ1Y"');
    expect(html).toContain('href="/account/subscription"');
    expect(html.match(/role="tab"/g)).toHaveLength(2);
    expect(html).toContain(locale === "fr" ? "Scans permanents, sans expiration." : "Permanent scans with no expiry.");
    expect(html).toContain(locale === "fr" ? "Les scans sont offerts après vérification" : "Scans are awarded after verification");
  });
});
