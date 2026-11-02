import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  exchange: vi.fn(),
  redeem: vi.fn(),
  attachReferral: vi.fn(),
  recordGrowth: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { exchangeCodeForSession: mocks.exchange } }),
}));
vi.mock("@/lib/beta/program", () => ({ redeemBetaInvite: mocks.redeem }));
vi.mock("@/lib/referral/service", () => ({ attachStoredReferralToNewUser: mocks.attachReferral }));
vi.mock("@/lib/growth/events", () => ({ recordGrowthEventSafely: mocks.recordGrowth }));

const { GET } = await import("./route");

function request(next?: string, extra: Record<string, string> = {}) {
  const url = new URL("https://kalivoa.com/auth/callback");
  url.searchParams.set("code", "test-code");
  if (next !== undefined) url.searchParams.set("next", next);
  for (const [key, value] of Object.entries(extra)) url.searchParams.set(key, value);
  return new NextRequest(url);
}

describe("authentication callback redirect", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.exchange.mockResolvedValue({ data: { user: { id: "test-user" } }, error: null });
  });

  it.each([
    "https://example.invalid/",
    "//example.invalid/",
    "/\\example.invalid/",
    "/\t/example.invalid/",
    "/\n/example.invalid/",
    "/\r/example.invalid/",
    "/\u0000/example.invalid/",
    "/ /example.invalid/",
    "javascript:alert(1)",
  ])("rejects an unsafe destination after a successful code exchange: %j", async (next) => {
    const response = await GET(request(next));
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://kalivoa.com/dashboard");
    expect(mocks.exchange).toHaveBeenCalledWith("test-code");
  });

  it("rejects the encoded backslash variant read from the query string", async () => {
    const response = await GET(new NextRequest("https://kalivoa.com/auth/callback?code=test-code&next=%2F%5Cexample.invalid"));
    expect(response.headers.get("location")).toBe("https://kalivoa.com/dashboard");
  });

  it.each(["/fr/dashboard", "/en/account?tab=profile#settings", "/fr/reset-password?source=email", "/.//example.invalid"])(
    "keeps the resolved internal destination without reparsing it: %s", async (next) => {
      const response = await GET(request(next));
      const location = new URL(response.headers.get("location")!);
      expect(location.origin).toBe("https://kalivoa.com");
      expect(location.href).toBe(new URL(next, "https://kalivoa.com").href);
    },
  );

  it("preserves the signup attribution and invitation for a normal login", async () => {
    await GET(request("/fr/dashboard", { invite: "test-invite", growthAnonymousId: "test-anonymous" }));
    expect(mocks.redeem).toHaveBeenCalledWith("test-invite", { id: "test-user" });
    expect(mocks.attachReferral).toHaveBeenCalledWith("test-user");
    expect(mocks.recordGrowth).toHaveBeenCalledWith(expect.objectContaining({ name: "signup_completed", anonymousId: "test-anonymous" }));
  });

  it("does not redeem invitations or attribute signup during password recovery, including with query parameters", async () => {
    await GET(request("/en/reset-password?source=email", { invite: "test-invite" }));
    expect(mocks.redeem).not.toHaveBeenCalled();
    expect(mocks.attachReferral).not.toHaveBeenCalled();
    expect(mocks.recordGrowth).not.toHaveBeenCalled();
  });

  it("keeps the localized login fallback when the exchange fails", async () => {
    mocks.exchange.mockResolvedValue({ data: { user: null }, error: { message: "Expired" } });
    const response = await GET(request("/en/dashboard"));
    expect(response.headers.get("location")).toBe("https://kalivoa.com/en/login?error=callback_failed");
    expect(mocks.recordGrowth).not.toHaveBeenCalled();
  });

  it("does not exchange a missing code", async () => {
    const response = await GET(new NextRequest("https://kalivoa.com/auth/callback?next=%2Fen%2Fdashboard"));
    expect(response.headers.get("location")).toBe("https://kalivoa.com/en/login?error=callback_failed");
    expect(mocks.exchange).not.toHaveBeenCalled();
  });
});
