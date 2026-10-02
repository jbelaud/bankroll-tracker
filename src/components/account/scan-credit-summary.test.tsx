import React from "react";
import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { NextIntlClientProvider } from "next-intl";
import fr from "../../../messages/fr.json";
import en from "../../../messages/en.json";
import { ScanCreditSummary } from "./scan-credit-summary";
import { summarizeScanWallet } from "@/lib/scan/credit-policy";
import type { ScanCreditBatch } from "@prisma/client";
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

vi.mock("@/lib/growth/client", () => ({ trackPublicGrowthEvent: vi.fn() }));
const now = new Date("2026-10-01T12:00:00Z");
const lot = (id: string, type: ScanCreditBatch["type"], quantity: number, expiresAt: Date | null): ScanCreditBatch => ({
  id, userId: "test", type, quantityGranted: quantity, quantityUsed: 0, quantityReserved: 0, quantityRevoked: 0,
  origin: "Test", grantKey: id, entitlementKey: null, grantedAt: now, expiresAt, status: "ACTIVE",
  periodStartedAt: null, stackable: true, requiresPaidPlan: false, conditions: null, partnerId: null, campaignId: null, referralRewardId: null,
});
const render = (locale: "fr" | "en", lots: ScanCreditBatch[]) => renderToStaticMarkup(
  <NextIntlClientProvider locale={locale} messages={locale === "fr" ? fr : en} timeZone="Europe/Paris">
    <ScanCreditSummary wallet={summarizeScanWallet(lots, "FREE", now)} />
  </NextIntlClientProvider>
);

describe("récapitulatif des scans", () => {
  it("affiche le total, une alerte accessible et sépare les permanents", () => {
    const html = render("fr", [lot("monthly", "MONTHLY", 10, new Date("2026-10-05T12:00:00Z")), lot("referral", "REFERRAL", 5, null)]);
    expect(html).toContain("15 scans disponibles");
    expect(html).toContain('role="status"');
    expect(html).toContain("10 de vos scans expirent bientôt");
    expect(html).toContain("5 octobre 2026");
    expect(html).toContain("Scans permanents : 5");
  });
  it("dispose de textes anglais et d'un état vide", () => {
    expect(render("en", [])).toContain("You have no scans available.");
    expect(render("fr", [])).toContain("Vous ne disposez d&#x27;aucun scan disponible.");
  });
  it("explique la période mensuelle différée sans la présenter comme permanente", () => {
    const html = render("fr", [lot("monthly", "MONTHLY", 10, null)]);
    expect(html).toContain("première utilisation");
    expect(html).not.toContain("Scans permanents");
  });

});

// Aperçu facultatif pour la recette visuelle ; ce n'est pas un test supplémentaire.
if (process.env.SCAN_CREDIT_PREVIEW_DIR) {
    const directory = process.env.SCAN_CREDIT_PREVIEW_DIR;
    mkdirSync(directory, { recursive: true });
    const cssDirectory = ".next/static/chunks";
    const css = readdirSync(cssDirectory).filter((file) => file.endsWith(".css"))
      .map((file) => readFileSync(join(cssDirectory, file), "utf8")).join("\n");
    const html = render("fr", [lot("monthly", "MONTHLY", 10, new Date("2026-10-05T12:00:00Z")),
      lot("partner", "PARTNER", 5, new Date("2026-10-03T12:00:00Z")), lot("referral", "REFERRAL", 10, null),
      lot("initial", "INITIAL", 4, null)]);
    writeFileSync(join(directory, "index.html"), `<!doctype html><html lang="fr" class="dark"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Kalivoa — aperçu local des scans</title><style>${css}</style></head><body class="bg-background text-foreground"><main class="mx-auto max-w-xl space-y-5 p-4"><h1 class="text-xl font-semibold">Mes scans Kalivoa</h1><p class="text-sm text-muted-foreground">Aperçu de test local</p><section class="glass-card rounded-xl p-4">${html}</section></main></body></html>`);
}
