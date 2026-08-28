import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  betaInviteFindUnique: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    betaInvite: { findUnique: mocks.betaInviteFindUnique },
  },
}));

const { GET } = await import("./route");

const code = "AbCdEfGhIjKlMnOpQrStUv";

describe("GET /join/[code]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("redirige un lien attribué vers l'inscription avec son invitation et ses UTM", async () => {
    mocks.betaInviteFindUnique.mockResolvedValue({
      utmSource: "tiktok",
      utmMedium: "organic_social",
      utmCampaign: "content_scan_01",
    });

    const response = await GET(
      new Request(`https://preview.example.com/join/${code}`),
      { params: Promise.resolve({ code }) },
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      `https://preview.example.com/fr/signup?invite=${code}&utm_source=tiktok&utm_medium=organic_social&utm_campaign=content_scan_01`,
    );
    expect(mocks.betaInviteFindUnique).toHaveBeenCalledWith({
      where: { publicCode: code },
      select: { utmSource: true, utmMedium: true, utmCampaign: true },
    });
  });

  it("redirige un code syntaxiquement valide mais inconnu sans révéler d'erreur", async () => {
    mocks.betaInviteFindUnique.mockResolvedValue(null);

    const response = await GET(
      new Request(`https://preview.example.com/join/${code}`),
      { params: Promise.resolve({ code }) },
    );

    expect(response.headers.get("location")).toBe(
      `https://preview.example.com/fr/signup?invite=${code}`,
    );
  });

  it("écarte un code mal formé sans interroger la base", async () => {
    const response = await GET(
      new Request("https://preview.example.com/join/short"),
      { params: Promise.resolve({ code: "short" }) },
    );

    expect(response.headers.get("location")).toBe("https://preview.example.com/fr/signup");
    expect(mocks.betaInviteFindUnique).not.toHaveBeenCalled();
  });
});
