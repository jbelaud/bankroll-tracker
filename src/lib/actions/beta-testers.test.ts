import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  requireUser: vi.fn(),
  isBetaPhaseActive: vi.fn(),
  betaInviteCreate: vi.fn(),
  betaInviteUpdateMany: vi.fn(),
  revalidatePath: vi.fn(),
  headers: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/admin", () => ({ requireAdmin: mocks.requireAdmin }));
vi.mock("@/lib/auth", () => ({ requireUser: mocks.requireUser }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    betaInvite: {
      create: mocks.betaInviteCreate,
      updateMany: mocks.betaInviteUpdateMany,
    },
  },
}));
vi.mock("@/lib/i18n/get-server-locale", () => ({ getServerLocale: vi.fn().mockResolvedValue("fr") }));
vi.mock("@/lib/beta/program", () => ({
  BETA_INVITE_DURATION_DAYS: 14,
  BETA_INVITE_TOKEN_BYTES: 16,
  DEFAULT_BETA_CAMPAIGN_MAX_REDEMPTIONS: 50,
  MAX_BETA_CAMPAIGN_MAX_REDEMPTIONS: 100,
  hashBetaInviteToken: (token: string) => `hash:${token}`,
  isBetaPhaseActive: mocks.isBetaPhaseActive,
}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("next/headers", () => ({ headers: mocks.headers }));

const { createBetaCampaignInvite } = await import("@/lib/actions/beta-testers");

describe("createBetaCampaignInvite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://preview.example.com/fr");
    mocks.requireAdmin.mockResolvedValue({ id: "admin-1" });
    mocks.isBetaPhaseActive.mockResolvedValue(true);
    mocks.betaInviteCreate.mockResolvedValue({ id: "invite-1" });
  });

  it("crée un lien court attribué et récupérable depuis l'administration", async () => {
    const result = await createBetaCampaignInvite(25, {
      source: " X ",
      medium: "Organic_Social",
      campaign: "X_Scan_Demo_01",
    });

    const data = mocks.betaInviteCreate.mock.calls[0][0].data;
    expect(data.publicCode).toMatch(/^[A-Za-z0-9_-]{22}$/);
    expect(data.tokenHash).toBe(`hash:${data.publicCode}`);
    expect(data).toMatchObject({
      utmSource: "x",
      utmMedium: "organic_social",
      utmCampaign: "x_scan_demo_01",
      maxRedemptions: 25,
    });
    expect(result).toEqual({
      url: `https://preview.example.com/join/${data.publicCode}`,
      maxRedemptions: 25,
    });
    expect(mocks.requireAdmin).toHaveBeenCalledOnce();
  });

  it("refuse une attribution UTM non sûre avant toute écriture", async () => {
    await expect(createBetaCampaignInvite(25, {
      source: "x<script>",
      medium: "organic_social",
      campaign: "x_scan_demo_01",
    })).rejects.toThrow("La source UTM");

    expect(mocks.betaInviteCreate).not.toHaveBeenCalled();
  });

  it("refuse la création lorsque la phase bêta est terminée", async () => {
    mocks.isBetaPhaseActive.mockResolvedValue(false);

    await expect(createBetaCampaignInvite()).rejects.toThrow("La phase bêta est terminée.");
    expect(mocks.betaInviteCreate).not.toHaveBeenCalled();
  });
});
