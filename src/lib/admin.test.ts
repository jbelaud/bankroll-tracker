import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getUser: vi.fn(), getAssurance: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({
  notFound: () => { throw new Error("NOT_FOUND"); },
  redirect: (path: string) => { throw new Error(`REDIRECT:${path}`); },
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getUser: mocks.getUser, mfa: { getAuthenticatorAssuranceLevel: mocks.getAssurance } } }),
}));
vi.mock("@/lib/i18n/get-server-locale", () => ({ getServerLocale: async () => "en" }));
const { checkAdminAccess, requireAdmin, requireAdminIdentity } = await import("./admin");
const { adminApiDenial } = await import("./admin-api");
const user = { id: "admin-user", email: "admin@example.invalid", email_confirmed_at: "2026-10-01T00:00:00Z", is_anonymous: false };

describe("administrator second factor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("ADMIN_EMAILS", "admin@example.invalid");
    mocks.getUser.mockResolvedValue({ data: { user }, error: null });
    mocks.getAssurance.mockResolvedValue({ data: { currentLevel: "aal2" }, error: null });
  });

  it("allows the verified configured administrator at AAL2", async () => {
    expect(await requireAdmin()).toEqual(user);
    expect(await adminApiDenial()).toBeNull();
  });

  it("requires MFA even if an AAL1 user's metadata claims administrator access", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { ...user, user_metadata: { role: "admin", aal: "aal2" } } }, error: null });
    mocks.getAssurance.mockResolvedValue({ data: { currentLevel: "aal1", nextLevel: "aal1" }, error: null });
    expect(await checkAdminAccess()).toEqual({ status: "mfa_required" });
    await expect(requireAdmin()).rejects.toThrow("REDIRECT:/en/admin/security");
    const denial = await adminApiDenial();
    expect(denial?.status).toBe(403);
    expect(await denial?.json()).toEqual({ error: "mfa_required" });
  });

  it("permits only enrollment/challenge access at AAL1", async () => {
    mocks.getAssurance.mockResolvedValue({ data: { currentLevel: "aal1" }, error: null });
    expect(await requireAdminIdentity()).toEqual(user);
    expect(mocks.getAssurance).not.toHaveBeenCalled();
  });

  it.each([
    { ...user, email: "member@example.invalid" },
    { ...user, email_confirmed_at: null },
    { ...user, is_anonymous: true },
  ])("rejects an unauthorized identity before checking MFA: %j", async (identity) => {
    mocks.getUser.mockResolvedValue({ data: { user: identity }, error: null });
    await expect(requireAdminIdentity()).rejects.toThrow("NOT_FOUND");
    expect((await adminApiDenial())?.status).toBe(403);
    expect(mocks.getAssurance).not.toHaveBeenCalled();
  });

  it("returns 401 for a missing session and keeps it out of caches", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: { name: "AuthSessionMissingError", status: 400 } });
    const response = await adminApiDenial();
    expect(response?.status).toBe(401);
    expect(response?.headers.get("cache-control")).toBe("private, no-store");
    await expect(requireAdmin()).rejects.toThrow("REDIRECT:/en/login");
  });

  it("fails closed when assurance cannot be checked", async () => {
    mocks.getAssurance.mockResolvedValue({ data: null, error: { message: "Provider unavailable" } });
    expect(await checkAdminAccess()).toEqual({ status: "unavailable" });
    expect((await adminApiDenial())?.status).toBe(503);
    await expect(requireAdmin()).rejects.toThrow("momentanément indisponible");
  });

  it("distinguishes an authentication service failure from a missing session", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: { name: "AuthRetryableFetchError", status: 503 } });
    expect((await adminApiDenial())?.status).toBe(503);
  });
});
