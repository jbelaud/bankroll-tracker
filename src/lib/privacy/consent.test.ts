import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { browserAnalyticsChoice, readAnalyticsChoice, setBrowserAnalyticsChoice } from "./consent";
import { getAcquisitionContext, trackPublicGrowthEvent } from "@/lib/growth/client";

let cookie = ""; let store: Map<string, string>; const request = vi.fn();
beforeEach(() => {
  store = new Map(); cookie = ""; request.mockReset().mockResolvedValue({ ok: true });
  vi.stubGlobal("document", { get cookie() { return cookie; }, set cookie(value: string) { cookie = value; }, referrer: "https://google.com/" });
  vi.stubGlobal("location", { protocol: "https:" });
  vi.stubGlobal("window", { localStorage: { getItem: (key: string) => store.get(key) ?? null, setItem: (key: string, value: string) => store.set(key, value), removeItem: (key: string) => store.delete(key) }, location: { search: "?utm_source=guide&utm_medium=article" }, dispatchEvent: vi.fn() });
  vi.stubGlobal("fetch", request);
});
afterEach(() => vi.unstubAllGlobals());
describe("optional audience measurement", () => {
  it("does not write an identifier or send an event before consent", async () => {
    expect(getAcquisitionContext().anonymousId).toBe("");
    await trackPublicGrowthEvent("landing_view");
    expect(store.size).toBe(0); expect(request).not.toHaveBeenCalled();
  });
  it("rejects expired, corrupt and unsupported consent records", () => {
    for (const raw of ["bad", encodeURIComponent(JSON.stringify({ version: 1, choice: "accepted", expiresAt: "2000-01-01" })), encodeURIComponent(JSON.stringify({ version: 2, choice: "accepted", expiresAt: "2035-01-01" }))]) expect(readAnalyticsChoice(raw)).toBeNull();
  });
  it("allows measurements only after acceptance and keeps source properties", async () => {
    setBrowserAnalyticsChoice("accepted"); expect(browserAnalyticsChoice()).toBe("accepted");
    await trackPublicGrowthEvent("landing_view", { locale: "fr" });
    expect(store.has("kalivoa_growth_anonymous_id")).toBe(true);
    const payload = JSON.parse(request.mock.calls[0][1].body);
    expect(payload.properties).toMatchObject({ utm_source: "guide", utm_medium: "article", locale: "fr" });
    expect(cookie).toContain("Secure");
  });
  it("removes existing tracking identifiers and stops sending after refusal", async () => {
    setBrowserAnalyticsChoice("accepted"); getAcquisitionContext();
    setBrowserAnalyticsChoice("refused"); await trackPublicGrowthEvent("landing_view");
    expect(store.size).toBe(0); expect(request).not.toHaveBeenCalled();
  });
  it("does not break registration when browser storage is unavailable", () => {
    setBrowserAnalyticsChoice("accepted");
    window.localStorage.getItem = () => { throw new Error("blocked"); };
    expect(getAcquisitionContext().anonymousId).toBe("");
  });
});
