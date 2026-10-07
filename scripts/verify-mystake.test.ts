import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { SPORTS } from "@/lib/sports";
import { mergeTaxonomy, normalizeTaxonomyPair } from "@/lib/taxonomy";
import { analyzeTicketImage, getConfiguredScanProvider } from "@/lib/scan/ai-provider";
import { parseScanAnalysis } from "@/lib/scan/response";
import { normalizeExtractedFinancials } from "@/lib/scan/odds";
import { normalizeExtractedTicketDate } from "@/lib/scan/ticket-date";
import { resolveScannedTicketResult } from "@/lib/scan/ticket-evidence";

// Opt-in paid OCR verification. Supply the seven reference images as 01.png
// through 07.png in MYSTAKE_SCAN_FIXTURES_DIR. No screenshots are committed.
const fixtureDir = process.env.MYSTAKE_SCAN_FIXTURES_DIR;
const cases = [
  { ref: "306582485", sport: "Basketball", type: "Total points (prolongations incluses)", stake: 4, odds: 1.71, result: "GAGNE", pick: /(?:Over|Plus de).*170[.,]5/i, participant: "Twarde Pierniki Torun", score: [85, 104] },
  { ref: "306702732", sport: "Football", type: "Over/Under buts", stake: 11, odds: 2.09, result: "EN_ATTENTE", pick: /(?:Under|Moins de).*3/i, participant: "Martinique", score: null },
  { ref: "306571224", sport: "Tennis", type: "Total de jeux", stake: 4, odds: 2.15, result: "PERDU", pick: /(?:Over|Plus de).*20[.,]5/i, participant: "Bartunkova, Nikola", score: [2, 0] },
  { ref: "306676939", sport: "Football", type: "Handicap asiatique", stake: 6, odds: 1.46, result: "REMBOURSE", pick: /1\s*\(0\)/, participant: "Inter de Limeira SP", score: [2, 2] },
  { ref: "306566301", sport: "Football", type: "Handicap asiatique", stake: 3, odds: 2.22, result: "EN_ATTENTE", pick: /2\s*\(0\)/, participant: "ASD Torres Sassari", score: null },
  { ref: "306562379", sport: "Basketball", type: "Total points (prolongations incluses)", stake: 3, odds: 1.85, result: "PERDU", pick: /(?:Over|Plus de).*163[.,]5/i, participant: "Shimane Susanoo Magic", score: [73, 85] },
  { ref: "306700189", sport: "Football", type: "Handicap asiatique", stake: 5, odds: 1.32, result: "EN_ATTENTE", pick: /1\s*\(0\)/, participant: "Egypt", score: null },
];

describe.skipIf(!fixtureDir)("MyStake live screenshot verification", () => {
  it("extracts the seven reference tickets with the application's configured provider", async () => {
    const requireFromNext = createRequire(import.meta.resolve("next/package.json"));
    // Next skips .env.local under NODE_ENV=test. This opt-in check deliberately
    // uses the application's development provider configuration instead.
    const nodeEnv = process.env.NODE_ENV;
    vi.stubEnv("NODE_ENV", "development");
    const env = requireFromNext("@next/env").loadEnvConfig(process.cwd(), true, { info() {}, error() {} });
    Object.assign(process.env, env.combinedEnv);
    vi.stubEnv("NODE_ENV", nodeEnv);
    expect(getConfiguredScanProvider(), "application OCR provider must be configured").not.toBeNull();
    const taxonomy = mergeTaxonomy();
    for (const [index, expected] of cases.entries()) {
      const bytes = await readFile(join(fixtureDir!, `${String(index + 1).padStart(2, "0")}.png`));
      const output = await analyzeTicketImage({ base64: bytes.toString("base64"), mediaType: "image/png", taxonomy: SPORTS, bookmaker: "MyStake" })
        .catch((error: unknown) => {
          // SDK errors can include request URLs. Keep credentials out of logs.
          const status = error && typeof error === "object" && "status" in error ? String(error.status) : "network/provider";
          const code = error instanceof Error ? error.name : "UnknownError";
          let detail = error instanceof Error ? error.message : "";
          for (const secret of [process.env.GOOGLE_API_KEY, process.env.GEMINI_API_KEY, process.env.ANTHROPIC_API_KEY]) {
            if (secret) detail = detail.replaceAll(secret, "[redacted]");
          }
          detail = detail.replace(/https?:\/\/[^\s"<>]+/g, "[URL redacted]");
          throw new Error(`OCR failed for image ${index + 1}: ${status} (${code}) ${detail}`);
        });
      const analysis = parseScanAnalysis(output.text);
      expect(analysis.detectedBookmaker, `image ${index + 1}: no visible logo`).toBeNull();
      expect(analysis.bets, `image ${index + 1}: one ticket`).toHaveLength(1);
      const raw = analysis.bets[0] as Record<string, unknown>;
      expect(String(raw.ticketRef).replace(/^#\s*/, "")).toBe(expected.ref);
      expect(normalizeExtractedFinancials(raw.stake, raw.odds)).toEqual({ stake: expected.stake, odds: expected.odds });
      expect(normalizeTaxonomyPair(taxonomy, String(raw.sport), String(raw.betType)))
        .toEqual({ sport: expected.sport, betType: expected.type, taxonomyMismatch: false });
      expect(resolveScannedTicketResult(raw.ticketHeaderText, raw.result)).toBe(expected.result);
      expect(raw.date).toBeNull();
      expect(normalizeExtractedTicketDate(raw.dateText, raw.date, { requireVisibleText: true })).toBeNull();
      expect(raw.format).toBe("SIMPLE");
      expect(raw.boosted).toBe(false);
      expect(raw.freebet).toBe(false);
      expect(raw.live).toBe(false);
      expect(raw.cashOutAmount).toBeNull();
      expect(String(raw.description)).toMatch(expected.pick);
      expect(String(raw.description)).toContain(expected.participant);
      expect(raw.selections).toHaveLength(1);
      const selection = (raw.selections as Record<string, unknown>[])[0];
      expect(String(selection.label)).toMatch(expected.pick);
      expect(selection.odds).toBe(expected.odds);
      if (expected.score) {
        expect(String(raw.eventResult)).toMatch(new RegExp(`${expected.score[0]}\\s*[-:]\\s*${expected.score[1]}`));
      } else {
        expect(raw.eventResult).toBeNull();
      }
      console.info(`Image ${index + 1}: ${expected.sport}, ${expected.type}, ${expected.result} — OK (${output.model})`);
    }
  }, 300_000);
});
