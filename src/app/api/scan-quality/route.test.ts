import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { CONFIRMED_SCAN_DETAILS } from "@/lib/scan/learning";

const mocks = vi.hoisted(() => ({ user: vi.fn(), bankroll: vi.fn(), count: vi.fn(), create: vi.fn(),
  upload: vi.fn(), remove: vi.fn(), discord: vi.fn() }));
vi.mock("@/lib/auth", () => ({ requireUser: mocks.user }));
vi.mock("@/lib/prisma", () => ({ prisma: { bankroll: { findFirst: mocks.bankroll },
  scanQualityReport: { count: mocks.count, create: mocks.create } } }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminSupabaseClient: () => ({ storage: { from: () => ({ upload: mocks.upload, remove: mocks.remove }) } }) }));
vi.mock("@/lib/scan/discord-quality", () => ({ sendQualityReportToDiscord: mocks.discord }));
const { POST } = await import("./route");

function request(consent = true, issue = "CONFIRMED") {
  const form = new FormData();
  form.set("consent", String(consent)); form.set("issueType", issue); form.set("bankrollId", "bankroll");
  form.set("promptVersion", "historical-version:common-123");
  form.set("image", new File(["image"], "ticket.png", { type: "image/png" }));
  form.set("rawExtraction", "[]"); form.set("finalExtraction", "[]");
  return new NextRequest("https://kalivoa.test/api/scan-quality", { method: "POST", body: form,
    headers: { origin: "https://kalivoa.test", host: "kalivoa.test" } });
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.user.mockResolvedValue({ id: "owner" }); mocks.bankroll.mockResolvedValue({ id: "bankroll", bookmaker: "Unibet" });
  mocks.count.mockResolvedValue(0); mocks.upload.mockResolvedValue({ error: null });
  mocks.create.mockResolvedValue({}); mocks.discord.mockResolvedValue({ sent: true });
});

describe("optional scan confirmation", () => {
  it("requires explicit consent and ownership before storing any screenshot", async () => {
    expect((await POST(request(false))).status).toBe(400);
    expect(mocks.upload).not.toHaveBeenCalled();
    mocks.bankroll.mockResolvedValue(null);
    expect((await POST(request())).status).toBe(404);
    expect(mocks.upload).not.toHaveBeenCalled();
  });
  it("keeps confirmations unapproved, records their source version and does not send an error notification", async () => {
    expect((await POST(request())).status).toBe(201);
    const data = mocks.create.mock.calls[0][0].data;
    expect(data).toMatchObject({ issueType: "OTHER", issueDetails: CONFIRMED_SCAN_DETAILS,
      promptVersion: "historical-version:common-123", userId: "owner" });
    expect(data.status).toBeUndefined(); // database default NEW, never APPROVED
    expect(mocks.discord).not.toHaveBeenCalled();
  });
  it("preserves existing error reporting", async () => {
    expect((await POST(request(true, "INCORRECT"))).status).toBe(201);
    expect(mocks.discord).toHaveBeenCalledOnce();
  });
});
