import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server";
const mocks = vi.hoisted(() => ({ getUser: vi.fn() }));
vi.mock("@supabase/ssr", () => ({ createServerClient: () => ({ auth: { getUser: mocks.getUser } }) }));
vi.mock("next-intl/middleware", () => ({ default: () => () => NextResponse.next() }));
import { config, proxy } from "./proxy";
beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
  mocks.getUser.mockResolvedValue({ data: { user: null } });
});
describe("navigation partenaires protégée", () => {
  it("sert security.txt sans i18n et conserve le routage des pages privées", () => {
    expect(unstable_doesMiddlewareMatch({ config, url: "/.well-known/security.txt" })).toBe(false);
    expect(unstable_doesMiddlewareMatch({ config, url: "/.well-known/security.txt?check=1" })).toBe(false);
    for (const url of ["/fr/partners", "/fr/admin", "/fr/dashboard", "/.well-known/other"]) {
      expect(unstable_doesMiddlewareMatch({ config, url })).toBe(true);
    }
  });
  it.each(["fr", "en"])("redirige la route privée vers la connexion en %s", async (locale) => {
    const response = await proxy(new NextRequest(`https://kalivoa.com/${locale}/partners`));
    expect(response.headers.get("location")).toBe(`https://kalivoa.com/${locale}/login`);
    expect(response.headers.get("content-security-policy")).toContain("frame-ancestors 'none'");
  });
  it("conserve la présentation publique accessible sans compte", async () => {
    const response = await proxy(new NextRequest("https://kalivoa.com/fr/partenaires"));
    expect(response.headers.get("location")).toBeNull();
  });
  it("laisse le membre accéder à sa page d'offres", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: "member" } } });
    const response = await proxy(new NextRequest("https://kalivoa.com/fr/partners"));
    expect(response.headers.get("location")).toBeNull();
  });
});

