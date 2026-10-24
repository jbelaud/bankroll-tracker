import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ requireUser: vi.fn(), save: vi.fn(), revalidate: vi.fn() }));
vi.mock("@/lib/auth", () => ({ requireUser: mocks.requireUser }));
vi.mock("@/lib/email-marketing/preferences", () => ({ saveEmailMarketingPreference: mocks.save }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
const { updateEmailMarketingPreference } = await import("./email-marketing");
const form = (choice?: string, intent = "save") => {
  const data = new FormData();
  data.set("locale", "fr"); data.set("source", "post_login"); data.set("intent", intent);
  data.set("userId", "someone-else");
  if (choice !== undefined) data.set("marketingEmail", choice);
  return data;
};
describe("email marketing choices", () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.requireUser.mockResolvedValue({ id: "session-user", email: "owner@example.test" }); mocks.save.mockResolvedValue(undefined); });
  it("does not infer consent from a missing checkbox", async () => {
    expect(await updateEmailMarketingPreference({ status: "idle" }, form())).toEqual({ status: "saved", enabled: false });
    expect(mocks.save).toHaveBeenCalledWith({ id: "session-user", email: "owner@example.test" }, false, "fr", "post_login");
  });
  it("accepts explicit consent only for the authenticated user", async () => {
    expect(await updateEmailMarketingPreference({ status: "idle" }, form("yes"))).toEqual({ status: "saved", enabled: true });
    expect(mocks.save).toHaveBeenCalledWith({ id: "session-user", email: "owner@example.test" }, true, "fr", "post_login");
  });
  it("No thanks overrides a checked box", async () => {
    expect(await updateEmailMarketingPreference({ status: "idle" }, form("yes", "decline"))).toMatchObject({ enabled: false });
  });
  it("rejects missing intent without changing any preference", async () => {
    const data = form("yes"); data.delete("intent");
    expect(await updateEmailMarketingPreference({ status: "idle" }, data)).toEqual({ status: "error" });
    expect(mocks.save).not.toHaveBeenCalled();
  });
  it("cannot change preferences without a session", async () => {
    mocks.requireUser.mockRejectedValue(new Error("Not authenticated"));
    expect(await updateEmailMarketingPreference({ status: "idle" }, form("yes"))).toEqual({ status: "error" });
    expect(mocks.save).not.toHaveBeenCalled();
  });
  it("never reports success after a storage error", async () => {
    mocks.save.mockRejectedValue(new Error("Unavailable"));
    expect(await updateEmailMarketingPreference({ status: "idle" }, form("yes"))).toEqual({ status: "error" });
    expect(mocks.revalidate).not.toHaveBeenCalled();
  });
});
