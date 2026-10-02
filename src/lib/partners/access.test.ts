import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ getUser: vi.fn(), offers: vi.fn(), redirect: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { getUser: mocks.getUser } }) }));
vi.mock("@/lib/partners/catalogue", () => ({ getPublicPartners: mocks.offers }));
vi.mock("@/i18n/navigation", () => ({ redirect: mocks.redirect }));
import { getMemberPartnerOffers } from "./access";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.redirect.mockImplementation(() => { throw new Error("REDIRECT_LOGIN"); });
  mocks.offers.mockReturnValue([{ id: "winamax", promoCode: "member-only-code" }]);
});
describe("accès aux offres réservées aux membres", () => {
  it.each([null, { id: "anon", email: "anon@example.test", is_anonymous: true }, { id: "no-email" }])("redirige avant de lire les liens et codes pour un visiteur sans compte valide", async (user) => {
    mocks.getUser.mockResolvedValue({ data: { user }, error: null });
    await expect(getMemberPartnerOffers("fr")).rejects.toThrow("REDIRECT_LOGIN");
    expect(mocks.redirect).toHaveBeenCalledWith({ href: "/login", locale: "fr" });
    expect(mocks.offers).not.toHaveBeenCalled();
  });
  it("refuse aussi les offres quand la vérification de session échoue", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: "user", email: "member@example.test" } }, error: new Error("Expired token") });
    await expect(getMemberPartnerOffers("en")).rejects.toThrow("REDIRECT_LOGIN");
    expect(mocks.redirect).toHaveBeenCalledWith({ href: "/login", locale: "en" });
    expect(mocks.offers).not.toHaveBeenCalled();
  });
  it("transmet les offres seulement après vérification du membre par le serveur", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: "user", email: "member@example.test", is_anonymous: false } }, error: null });
    expect(await getMemberPartnerOffers("fr")).toEqual([{ id: "winamax", promoCode: "member-only-code" }]);
    expect(mocks.offers).toHaveBeenCalledOnce();
    expect(mocks.redirect).not.toHaveBeenCalled();
  });
});
