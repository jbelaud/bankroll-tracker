import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ user: vi.fn(), admin: vi.fn(), submit: vi.fn(), review: vi.fn(), deliver: vi.fn(), retry: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth", () => ({ requireUser: mocks.user }));
vi.mock("@/lib/admin", () => ({ requireAdmin: mocks.admin }));
vi.mock("next-intl/server", () => ({ getLocale: async () => "fr" }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/partners/claims", () => ({ submitPartnerClaim: mocks.submit, reviewPartnerClaim: mocks.review }));
vi.mock("@/lib/partners/reward-emails", () => ({ deliverPartnerRewardEmail: mocks.deliver, retryPartnerRewardEmail: mocks.retry }));
import { declarePartnerReferral, decidePartnerReferral, resendPartnerReferralEmail } from "./partner-referrals";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.user.mockResolvedValue({ id: "actual-member", email: "member@example.test", is_anonymous: false });
  mocks.admin.mockResolvedValue({ id: "actual-admin" });
  mocks.review.mockResolvedValue({ id: "claim", status: "APPROVED" });
});

describe("autorisations des déclarations et validations", () => {
  it("refuse une soumission non authentifiée avant toute écriture", async () => {
    mocks.user.mockRejectedValue(new Error("Non authentifié"));
    await expect(declarePartnerReferral(new FormData())).rejects.toThrow("Non authentifié");
    expect(mocks.submit).not.toHaveBeenCalled();
  });
  it("refuse les comptes anonymes", async () => {
    mocks.user.mockResolvedValue({ id: "anonymous", email: "anon@example.test", is_anonymous: true });
    expect(await declarePartnerReferral(new FormData())).toEqual({ ok: false, error: "actionFailed" });
    expect(mocks.submit).not.toHaveBeenCalled();
  });
  it("prend le bénéficiaire dans la session et jamais dans le formulaire", async () => {
    const form = new FormData();
    for (const [key, val] of Object.entries({ partnerId: "winamax", bookmakerUsername: "Member123", registrationDate: "2026-01-01", confirmed: "on", userId: "victim", quantity: "999" })) form.set(key, val);
    expect(await declarePartnerReferral(form)).toEqual({ ok: true });
    expect(mocks.submit).toHaveBeenCalledWith("actual-member", "fr", expect.objectContaining({ partnerId: "winamax" }));
  });
  it("refuse validation et renvoi d'email aux non-administrateurs", async () => {
    mocks.admin.mockRejectedValue(new Error("NOT_ADMIN"));
    await expect(decidePartnerReferral(new FormData())).rejects.toThrow("NOT_ADMIN");
    await expect(resendPartnerReferralEmail("claim")).rejects.toThrow("NOT_ADMIN");
    expect(mocks.review).not.toHaveBeenCalled();
    expect(mocks.deliver).not.toHaveBeenCalled();
    expect(mocks.retry).not.toHaveBeenCalled();
  });
  it("conserve la validation si l'email échoue après l'attribution", async () => {
    mocks.deliver.mockRejectedValue(new Error("PROVIDER_UNAVAILABLE"));
    const form = new FormData(); form.set("claimId", "claim"); form.set("revision", "1"); form.set("decision", "APPROVED");
    expect(await decidePartnerReferral(form)).toEqual({ ok: true });
    expect(mocks.review).toHaveBeenCalledWith("actual-admin", expect.objectContaining({ decision: "APPROVED" }));
  });
});
