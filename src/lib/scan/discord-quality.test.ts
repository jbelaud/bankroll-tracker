import { afterEach, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { sendQualityReportToDiscord } from "./discord-quality";
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
it("notifies administrators without exporting the screenshot or the user's comment", async () => {
  vi.stubEnv("DISCORD_SCAN_FEEDBACK_WEBHOOK_URL", "https://discord.com/api/webhooks/test/fixture");
  const request = vi.fn().mockResolvedValue({ ok: true }); vi.stubGlobal("fetch", request);
  await sendQualityReportToDiscord({ reportId: "report-fixture", bookmaker: "private-bookmaker", issueType: "INCORRECT", issueDetails: "private-user-comment", image: new File(["private-image"], "ticket.png", {type:"image/png"}) });
  const options = request.mock.calls[0][1];
  expect(options.headers["Content-Type"]).toBe("application/json");
  expect(JSON.parse(options.body).allowed_mentions.parse).toEqual([]);
  expect(options.body).toContain("report-fixture");
  for (const value of ["private-bookmaker", "private-user-comment", "private-image", "ticket.png", "files["]) expect(options.body).not.toContain(value);
});
it("does not send anything if Discord is unconfigured", async () => {
  vi.stubEnv("DISCORD_SCAN_FEEDBACK_WEBHOOK_URL", "");
  const request = vi.fn(); vi.stubGlobal("fetch", request);
  expect(await sendQualityReportToDiscord({reportId:"test", bookmaker:"test",issueType:"OTHER",issueDetails:null,image:new File([],"test.png")})).toEqual({sent:false,reason:"not-configured"});
  expect(request).not.toHaveBeenCalled();
});
