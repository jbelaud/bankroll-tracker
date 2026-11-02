import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createHmac } from "node:crypto";
import { NextRequest } from "next/server";
const h = vi.hoisted(() => ({ find: vi.fn(), findFirst: vi.fn(), update: vi.fn(), userUpdate: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/privacy/retention", () => ({ inactivityCutoff: () => new Date("2024-10-11") }));
vi.mock("@/lib/prisma", () => ({ prisma: { transactionalEmail: { findUnique: h.find, findFirst: h.findFirst, updateMany: h.update }, user: { updateMany: h.userUpdate } } }));
import { POST } from "./route";
const bytes = Buffer.from("not-a-real-webhook-secret-12345678");
function event(type: string, valid = true) {
  const body = JSON.stringify({ type, created_at: new Date().toISOString(), data: { email_id: "mail_test", tags: { kalivoa_email_id: "row_test" } } });
  const id = "msg_test", timestamp = String(Math.floor(Date.now() / 1000));
  const signature = valid ? createHmac("sha256", bytes).update(`${id}.${timestamp}.${body}`).digest("base64") : "invalid";
  return new NextRequest("https://kalivoa.com/api/resend/webhook", { method: "POST", body, headers: { "svix-id": id, "svix-timestamp": timestamp, "svix-signature": `v1,${signature}` } });
}
beforeEach(() => {
  vi.resetAllMocks(); vi.stubEnv("RESEND_API_KEY", "test-placeholder"); vi.stubEnv("RESEND_WEBHOOK_SECRET", `whsec_${bytes.toString("base64")}`);
  h.find.mockResolvedValue({ id: "row_test", userId: "user_test", providerId: "mail_test", kind: "CONTRACT", status: "SENT", deliveredAt: null });
  h.update.mockResolvedValue({ count: 1 });
});
afterEach(() => vi.unstubAllEnvs());
describe("verified Resend delivery events", () => {
  it("rejects a forged delivery before database access", async () => {
    expect((await POST(event("email.delivered", false))).status).toBe(400); expect(h.find).not.toHaveBeenCalled();
  });
  it("records a signed delivery without trusting an email.sent event", async () => {
    expect((await POST(event("email.sent"))).status).toBe(200); expect(h.update).not.toHaveBeenCalled();
    expect((await POST(event("email.delivered"))).status).toBe(200); expect(h.update.mock.calls[0][0].data.status).toBe("DELIVERED");
  });
  it("starts the inactivity grace period only after a delivered warning", async () => {
    h.find.mockResolvedValue({ id: "row_test", userId: "user_test", providerId: "mail_test", kind: "INACTIVITY_WARNING", dedupeKey: `inactive:user_test:${new Date("2023-01-01").getTime()}`, deliveredAt: null });
    await POST(event("email.delivered")); expect(h.userUpdate).toHaveBeenCalledWith(expect.objectContaining({ data: { inactivityNoticeAt: expect.any(Date) } }));
  });
  it("holds an account and flags a bounced warning", async () => {
    h.find.mockResolvedValue({ id: "row_test", userId: "user_test", providerId: "mail_test", kind: "INACTIVITY_WARNING", dedupeKey: `inactive:user_test:${new Date("2023-01-01").getTime()}` });
    await POST(event("email.bounced")); expect(h.update.mock.calls[0][0].data.status).toBe("NEEDS_REVIEW");
    expect(h.userUpdate).toHaveBeenCalledWith(expect.objectContaining({ data: { inactivityNoticeAt: null } }));
  });
  it("does not accept a different provider email for the same tag", async () => {
    h.find.mockResolvedValue({ id: "row_test", providerId: "another_mail" }); await POST(event("email.delivered")); expect(h.update).not.toHaveBeenCalled();
  });
});
