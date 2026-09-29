import { afterEach, describe, expect, it, vi } from "vitest";
import { SPORTS } from "@/lib/sports";
import { analyzeTicketImage, generateTextWithConfiguredProvider, getConfiguredScanProvider, hasConfiguredScanProvider, STRICT_SCAN_SYSTEM_PROMPT } from "./ai-provider";

const anthropicCreate = vi.hoisted(() => vi.fn());
const geminiGenerateContent = vi.hoisted(() => vi.fn());

vi.mock("@anthropic-ai/sdk", () => ({
  default: class AnthropicMock {
    messages = { create: anthropicCreate };
  },
}));
vi.mock("@google/genai", () => ({
  GoogleGenAI: class GoogleGenAIMock {
    models = { generateContent: geminiGenerateContent };
  },
  ThinkingLevel: { MINIMAL: "MINIMAL" },
}));

describe("scan provider selection", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it("prefers Google when both providers are configured", () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "anthropic-test-key");
    vi.stubEnv("GOOGLE_API_KEY", "google-test-key");
    vi.stubEnv("GEMINI_API_KEY", "");

    expect(getConfiguredScanProvider()).toBe("gemini");
    expect(hasConfiguredScanProvider()).toBe(true);
  });

  it("uses Gemini when Anthropic is not configured", () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    vi.stubEnv("GOOGLE_API_KEY", "google-test-key");
    vi.stubEnv("GEMINI_API_KEY", "");

    expect(getConfiguredScanProvider()).toBe("gemini");
  });

  it("uses Anthropic when Google is not configured", () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "anthropic-test-key");
    vi.stubEnv("GOOGLE_API_KEY", "");
    vi.stubEnv("GEMINI_API_KEY", "");

    expect(getConfiguredScanProvider()).toBe("anthropic");
  });

  it("reports that no scan provider is configured", () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    vi.stubEnv("GOOGLE_API_KEY", "");
    vi.stubEnv("GEMINI_API_KEY", "");

    expect(getConfiguredScanProvider()).toBeNull();
    expect(hasConfiguredScanProvider()).toBe(false);
  });

  it("does not send Anthropic the incompatible structured-output schema", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "anthropic-test-key");
    vi.stubEnv("GOOGLE_API_KEY", "");
    vi.stubEnv("GEMINI_API_KEY", "");
    anthropicCreate.mockResolvedValue({
      content: [{ type: "text", text: '{"detectedBookmaker":null,"detectionConfidence":null,"bets":[]}' }],
      usage: { input_tokens: 10, output_tokens: 5 },
    });

    await analyzeTicketImage({
      base64: "image-data",
      mediaType: "image/png",
      taxonomy: SPORTS,
    });

    expect(anthropicCreate).toHaveBeenCalledWith(expect.not.objectContaining({
      output_config: expect.anything(),
    }));
  });

  it("sends Google the same strict OCR rules and extraction prompt", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "anthropic-test-key");
    vi.stubEnv("GOOGLE_API_KEY", "google-test-key");
    vi.stubEnv("GEMINI_MODEL", "");
    vi.stubEnv("GEMINI_SCAN_MODEL", "");
    geminiGenerateContent.mockResolvedValue({
      text: '{"detectedBookmaker":null,"detectionConfidence":null,"bets":[]}',
      usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 5, thoughtsTokenCount: 2 },
    });

    const result = await analyzeTicketImage({
      base64: "image-data",
      mediaType: "image/png",
      taxonomy: SPORTS,
      bookmaker: "PMU",
      bookmakerRules: "Règle testée",
    });

    expect(result.model).toBe("gemini-3.6-flash");
    expect(result.outputTokens).toBe(7);
    expect(geminiGenerateContent).toHaveBeenCalledWith(expect.objectContaining({
      model: "gemini-3.6-flash",
      contents: [
        { inlineData: { mimeType: "image/png", data: "image-data" } },
        { text: expect.stringContaining("Règle testée") },
      ],
      config: expect.objectContaining({ systemInstruction: STRICT_SCAN_SYSTEM_PROMPT }),
    }));
    expect(anthropicCreate).not.toHaveBeenCalled();
  });

  it("uses Google for insights with the same supplied prompt", async () => {
    vi.stubEnv("GOOGLE_API_KEY", "google-test-key");
    vi.stubEnv("GEMINI_MODEL", "");
    vi.stubEnv("GEMINI_INSIGHTS_MODEL", "");
    geminiGenerateContent.mockResolvedValue({ text: '{"appreciation":"OK"}' });

    expect(await generateTextWithConfiguredProvider("Règles AI Insight")).toBe('{"appreciation":"OK"}');
    expect(geminiGenerateContent).toHaveBeenCalledWith(expect.objectContaining({
      model: "gemini-3.5-flash-lite",
      contents: [{ role: "user", parts: [{ text: "Règles AI Insight" }] }],
    }));
  });

});
