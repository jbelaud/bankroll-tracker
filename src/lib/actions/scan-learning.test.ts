import { beforeEach, describe, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";
import { COMMON_SCAN_PROFILE, type LearningDraft } from "@/lib/scan/learning";
import { SCAN_PROMPT_VERSION } from "@/lib/scan/quality";
import { buildExtractionPrompt } from "@/lib/scan/extraction-prompt";
import { SPORTS } from "@/lib/sports";

const mocks = vi.hoisted(() => ({ admin: vi.fn(), profiles: vi.fn(), report: vi.fn(), reports: vi.fn(),
  updateReport: vi.fn(), update: vi.fn(), history: vi.fn(), download: vi.fn(), analyze: vi.fn(), generate: vi.fn(),
  profile: vi.fn(), previous: vi.fn(), revalidate: vi.fn() }));
vi.mock("@/lib/admin", () => ({ requireAdmin: mocks.admin }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
vi.mock("@/lib/prisma", () => {
  const db = { bookmakerScanProfile: { findMany: mocks.profiles, findUnique: mocks.profile, updateMany: mocks.update },
    bookmakerScanProfileVersion: { create: mocks.history, findFirst: mocks.previous },
    scanQualityReport: { findFirst: mocks.report, findMany: mocks.reports, update: mocks.updateReport } };
  return { prisma: { ...db, $transaction: (fn: (tx: typeof db) => unknown) => fn(db) } };
});
vi.mock("@/lib/supabase/admin", () => ({ createAdminSupabaseClient: () => ({ storage: { from: () => ({ download: mocks.download }) } }) }));
vi.mock("@/lib/scan/ai-provider", () => ({ analyzeTicketImage: mocks.analyze, generateTextWithConfiguredProvider: mocks.generate, configuredScanModel: () => "test-model" }));

const actions = await import("./scan-learning");
const hash = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const bet = { ticketRef: "0001", date: "2026-10-22", sport: "Football", betType: "Buteur", description: "Joueur A",
  stake: 10, odds: 2, result: "EN_ATTENTE", boosted: false, freebet: false, live: false };
const report = { id: "a", finalExtraction: [bet], rawExtraction: [{ ...bet, stake: 20 }], bookmaker: "Unibet",
  reviewedAt: new Date("2026-10-22T10:00:00Z"), storagePath: "user/a.png" };
let draft: LearningDraft;
let version: number;
const profile = () => ({ id: "common", bookmaker: COMMON_SCAN_PROFILE, supportStatus: "UNTESTED", rules: null, version, examples: draft });

beforeEach(() => {
  vi.resetAllMocks();
  version = 1;
  draft = { kind: "scan-learning-v1", rules: "Distinguer mise et gains.", explanation: "Mise corrigée.", sourceIds: ["a"], evaluation: null };
  mocks.admin.mockResolvedValue({ id: "admin" });
  mocks.profiles.mockImplementation(async () => [profile()]);
  mocks.profile.mockImplementation(async () => profile());
  mocks.update.mockImplementation(async () => { version++; return { count: 1 }; });
  mocks.report.mockResolvedValue(report);
  mocks.reports.mockResolvedValue([report]);
  mocks.download.mockResolvedValue({ data: new Blob(["test"], { type: "image/png" }), error: null });
});

describe("assisted learning actions", () => {
  it("checks admin authorization before any model, storage or database access", async () => {
    mocks.admin.mockRejectedValue(new Error("Interdit"));
    for (const call of [() => actions.proposeScanImprovement(), () => actions.evaluateScanImprovement("a"),
      () => actions.activateScanImprovement(), () => actions.disableScanImprovement(),
      () => actions.rollbackScanImprovement(),
      () => actions.editScanImprovement("règle"), () => actions.saveScanReference("a", "[]", "")]) {
      await expect(call()).rejects.toThrow("Interdit");
    }
    expect(mocks.profiles).not.toHaveBeenCalled(); expect(mocks.download).not.toHaveBeenCalled(); expect(mocks.analyze).not.toHaveBeenCalled();
  });

  it("replays the actual capture with both versions and persists per-field evidence", async () => {
    mocks.analyze.mockResolvedValueOnce({ text: JSON.stringify([{ ...bet, stake: 20 }]) })
      .mockResolvedValueOnce({ text: JSON.stringify([bet]) });
    await expect(actions.evaluateScanImprovement("a")).resolves.toMatchObject({ baselineErrors: 1, candidateErrors: 0, canActivate: false });
    expect(mocks.analyze.mock.calls[0][0].commonRules).toBeNull();
    expect(mocks.analyze.mock.calls[1][0].commonRules).toBe(draft.rules);
    expect(mocks.history).toHaveBeenCalled();
    const stored = mocks.update.mock.calls[1][0].data.examples as LearningDraft;
    expect(stored.evaluation?.cases[0]).toMatchObject({ baselineErrors: ["0:stake"], candidateErrors: [], regressions: [] });
  });

  it("does not store a passing test if the provider or image download fails", async () => {
    mocks.download.mockResolvedValue({ data: null, error: { message: "missing" } });
    await expect(actions.evaluateScanImprovement("a")).rejects.toThrow("Capture indisponible");
    expect(mocks.analyze).not.toHaveBeenCalled();
    expect(mocks.update.mock.calls[0][0].data.examples.evaluation.cases).toEqual([]);
  });

  it("blocks untested proposals and proposals tested only on generation examples", async () => {
    await expect(actions.activateScanImprovement()).rejects.toThrow("Compare la proposition");
    draft.sourceIds = ["a", "b"];
    draft.evaluation = { promptVersion: SCAN_PROMPT_VERSION,
      contextHash: hash({ prompt: buildExtractionPrompt(SPORTS), model: "test-model", profiles: [[COMMON_SCAN_PROFILE, null, "UNTESTED"]] }),
      evaluatedAt: new Date().toISOString(), cases: ["a", "b"].map((id) => ({ reportId: id, fingerprint: "x", baselineErrors: ["0:stake"], candidateErrors: [], regressions: [] })) };
    await expect(actions.activateScanImprovement()).rejects.toThrow("indépendante");
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("blocks changed or deleted reference examples before activation", async () => {
    draft.evaluation = { promptVersion: SCAN_PROMPT_VERSION,
      contextHash: hash({ prompt: buildExtractionPrompt(SPORTS), model: "test-model", profiles: [[COMMON_SCAN_PROFILE, null, "UNTESTED"]] }),
      evaluatedAt: new Date().toISOString(), cases: ["a", "b"].map((id) => ({ reportId: id, fingerprint: "old", baselineErrors: ["0:stake"], candidateErrors: [], regressions: [] })) };
    await expect(actions.activateScanImprovement()).rejects.toThrow("changé ou expiré");
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("activates a tested improvement with an independent unchanged example and keeps history", async () => {
    const second = { ...report, id: "b" };
    mocks.reports.mockResolvedValue([report, second]);
    draft.evaluation = { promptVersion: SCAN_PROMPT_VERSION,
      contextHash: hash({ prompt: buildExtractionPrompt(SPORTS), model: "test-model", profiles: [[COMMON_SCAN_PROFILE, null, "UNTESTED"]] }),
      evaluatedAt: new Date().toISOString(), cases: [report, second].map((item) => ({ reportId: item.id,
        fingerprint: hash([item.finalExtraction, item.reviewedAt, item.storagePath]), baselineErrors: ["0:stake"], candidateErrors: [], regressions: [] })) };
    await actions.activateScanImprovement();
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ rules: draft.rules, supportStatus: "TESTED" }) }));
    expect(mocks.history).toHaveBeenCalled();
  });

  it("restores only a previously tested complement, without changing the base rules", async () => {
    mocks.previous.mockResolvedValue({ rules: "Ancienne règle validée." });
    await actions.rollbackScanImprovement();
    expect(mocks.previous).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ supportStatus: "TESTED" }) }));
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ rules: "Ancienne règle validée.", supportStatus: "TESTED" }) }));
    expect(mocks.history).toHaveBeenCalledOnce();
  });
});
