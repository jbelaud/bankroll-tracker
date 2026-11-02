import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ access: vi.fn(), count: vi.fn(), report: vi.fn(), signedUrl: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/admin", () => ({ checkAdminAccess: mocks.access }));
vi.mock("@/lib/prisma", () => ({ prisma: { partnerReferralClaim: { count: mocks.count }, scanQualityReport: { findUnique: mocks.report } } }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminSupabaseClient: () => ({ storage: { from: () => ({ createSignedUrl: mocks.signedUrl }) } }) }));
const { GET: getCount } = await import("@/app/api/admin/partner-referrals/count/route");
const { GET: getImage } = await import("@/app/api/admin/scan-quality/[id]/image/route");

describe("administrative API access", () => {
  beforeEach(() => vi.clearAllMocks());

  it.each([
    ["unauthenticated", 401], ["forbidden", 403], ["mfa_required", 403], ["unavailable", 503],
  ])("rejects %s on both endpoints before accessing data", async (status, expected) => {
    mocks.access.mockResolvedValue({ status });
    const count = await getCount();
    const image = await getImage({} as never, { params: Promise.resolve({ id: "test-report" }) });
    for (const response of [count, image]) {
      expect(response.status).toBe(expected);
      expect(response.headers.get("cache-control")).toBe("private, no-store");
      expect(await response.json()).toEqual({ error: status });
    }
    expect(mocks.count).not.toHaveBeenCalled();
    expect(mocks.report).not.toHaveBeenCalled();
    expect(mocks.signedUrl).not.toHaveBeenCalled();
  });

  it("returns the count after a fully authorized session", async () => {
    mocks.access.mockResolvedValue({ status: "allowed", user: { id: "admin" } });
    mocks.count.mockResolvedValue(3);
    const response = await getCount();
    expect(await response.json()).toEqual({ count: 3 });
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });

  it("does not hide an unexpected data service error behind an authorization status", async () => {
    mocks.access.mockResolvedValue({ status: "allowed", user: { id: "admin" } });
    mocks.count.mockRejectedValue(new Error("Database unavailable"));
    await expect(getCount()).rejects.toThrow("Database unavailable");
  });
});
