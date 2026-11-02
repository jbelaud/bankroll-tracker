import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ query: vi.fn(), execute: vi.fn(), transaction: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/prisma", () => ({ prisma: { $queryRaw: mocks.query, $transaction: mocks.transaction } }));
const { getEmailMarketingPreference, saveEmailMarketingPreference } = await import("./preferences");
describe("marketing consent storage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.transaction.mockImplementation(async (fn) => fn({ $queryRaw: mocks.query, $executeRaw: mocks.execute }));
  });
  it("leaves historical accounts unsubscribed without creating a record", async () => {
    mocks.query.mockResolvedValue([]);
    expect(await getEmailMarketingPreference("u", "a@example.test")).toBeNull();
    expect(mocks.execute).not.toHaveBeenCalled();
  });
  it("does not transfer consent to a changed email address", async () => {
    mocks.query.mockResolvedValue([{ enabled: true, consentedEmail: "old@example.test" }]);
    expect(await getEmailMarketingPreference("u", "new@example.test")).toBeNull();
  });
  it("does not keep prompting someone who refused", async () => {
    mocks.query.mockResolvedValue([{ enabled: false, consentedEmail: null }]);
    expect(await getEmailMarketingPreference("u", "a@example.test")).toEqual({ enabled: false });
  });
  it("withdraws and records the choice in the same transaction", async () => {
    mocks.query.mockResolvedValueOnce([{ id: "u" }]).mockResolvedValueOnce([{ enabled: true, consentedEmail: "a@example.test" }]);
    await saveEmailMarketingPreference({ id: "u", email: "a@example.test" }, false, "fr", "account");
    expect(mocks.transaction).toHaveBeenCalledOnce();
    expect(mocks.execute).toHaveBeenCalledTimes(2);
    expect(mocks.execute.mock.calls[0]).toContain(false);
    expect(mocks.execute.mock.calls[1]).toContain("2026-10-24-v1");
  });
  it("does not replace the evidence timestamp for an unchanged choice", async () => {
    mocks.query.mockResolvedValueOnce([{ id: "u" }]).mockResolvedValueOnce([{ enabled: true, consentedEmail: "a@example.test" }]);
    await saveEmailMarketingPreference({ id: "u", email: "a@example.test" }, true, "fr", "account");
    expect(mocks.execute).not.toHaveBeenCalled();
  });
});
