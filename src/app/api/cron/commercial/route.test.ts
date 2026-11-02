import { afterEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ purge:vi.fn().mockResolvedValue({drafts:0,analytics:0,closedSupport:0}), reminders:vi.fn(), warnings:vi.fn(), accounts:vi.fn(), emails:vi.fn(), withdrawals:vi.fn() }));
vi.mock("server-only",()=>({}));
vi.mock("@/lib/billing/commercial-config",()=>({commercialRecordsEnabled:()=>false}));
vi.mock("@/lib/privacy/retention",()=>({purgeTemporaryData:mocks.purge,queueInactivityWarnings:mocks.warnings,purgeInactiveAccounts:mocks.accounts}));
vi.mock("@/lib/billing/records",()=>({queueAnnualReminders:mocks.reminders}));
vi.mock("@/lib/billing/withdrawals",()=>({retryWithdrawals:mocks.withdrawals}));
vi.mock("@/lib/billing/transactional-emails",()=>({retryTransactionalEmails:mocks.emails}));
vi.mock("@/lib/stripe",()=>({stripe:null}));
import { GET } from "./route";
import { NextRequest } from "next/server";
afterEach(()=>{vi.unstubAllEnvs(); vi.clearAllMocks();});
it("cleans temporary data during beta without triggering commercial mail or account deletion",async()=>{
 vi.stubEnv("CRON_SECRET","fixture");
 const response=await GET(new NextRequest("https://kalivoa.com/api/cron/commercial",{headers:{authorization:"Bearer fixture"}}));
 expect(response.status).toBe(200); expect(mocks.purge).toHaveBeenCalledOnce();
 for(const fn of [mocks.reminders,mocks.warnings,mocks.accounts,mocks.emails,mocks.withdrawals]) expect(fn).not.toHaveBeenCalled();
});
it("rejects unauthenticated cleanup",async()=>{
 vi.stubEnv("CRON_SECRET","fixture");
 expect((await GET(new NextRequest("https://kalivoa.com/api/cron/commercial"))).status).toBe(401);
 expect(mocks.purge).not.toHaveBeenCalled();
});
