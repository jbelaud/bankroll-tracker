import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { fetchStripePdf } from "./invoice-pdf";
afterEach(() => vi.unstubAllGlobals());
describe("private accounting PDF archive", () => {
  it("refuses arbitrary external locations before fetching", async () => {
    const network = vi.fn(); vi.stubGlobal("fetch", network);
    await expect(fetchStripePdf("https://attacker.example/invoice.pdf")).rejects.toThrow("Untrusted PDF origin"); expect(network).not.toHaveBeenCalled();
  });
  it("stores provider PDF bytes and rejects a false PDF", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("%PDF-fixture", { headers: { "content-type": "application/pdf" } })));
    expect(new TextDecoder().decode(await fetchStripePdf("https://invoice.stripe.com/test.pdf"))).toBe("%PDF-fixture");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("<html>error</html>")));
    await expect(fetchStripePdf("https://invoice.stripe.com/test.pdf")).rejects.toThrow("Invalid PDF archive");
  });
  it("does not follow a redirect to an untrusted host", async () => {
    const network = vi.fn().mockResolvedValue(new Response(null, { status: 302, headers: { location: "https://attacker.example/" } })); vi.stubGlobal("fetch", network);
    await expect(fetchStripePdf("https://invoice.stripe.com/test.pdf")).rejects.toThrow("Untrusted PDF origin"); expect(network).toHaveBeenCalledOnce();
  });
});
