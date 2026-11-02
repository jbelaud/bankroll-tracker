import { beforeEach, describe, expect, it } from "vitest";
import { checkIpRateLimit, clientIp, resetIpRateLimitsForTests } from "./ip-rate-limit";

describe("checkIpRateLimit", () => {
  beforeEach(resetIpRateLimitsForTests);

  it("bloque au-delà de la limite puis rouvre après la fenêtre", () => {
    const opts = { limit: 2, windowMs: 1000 };
    expect(checkIpRateLimit("ip", { ...opts, now: 0 }).allowed).toBe(true);
    expect(checkIpRateLimit("ip", { ...opts, now: 10 }).allowed).toBe(true);
    const blocked = checkIpRateLimit("ip", { ...opts, now: 20 });
    expect(blocked).toEqual({ allowed: false, retryAfterSeconds: 1 });
    expect(checkIpRateLimit("ip", { ...opts, now: 1001 }).allowed).toBe(true);
  });

  it("isole les clés", () => {
    expect(checkIpRateLimit("a", { limit: 1, windowMs: 1000, now: 0 }).allowed).toBe(true);
    expect(checkIpRateLimit("b", { limit: 1, windowMs: 1000, now: 0 }).allowed).toBe(true);
  });

  it("lit l'IP client", () => {
    expect(clientIp(new Headers({ "x-forwarded-for": "1.2.3.4, 5.6.7.8" }))).toBe("1.2.3.4");
  });
});
