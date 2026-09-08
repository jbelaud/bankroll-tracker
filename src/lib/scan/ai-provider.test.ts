import { afterEach, describe, expect, it, vi } from "vitest";
import { SPORTS } from "@/lib/sports";
import { analyzeTicketImage, getConfiguredScanProvider, hasConfiguredScanProvider } from "./ai-provider";

const anthropicCreate = vi.hoisted(() => vi.fn());

vi.mock("@anthropic-ai/sdk", () => ({
  default: class AnthropicMock {
    messages = { create: anthropicCreate };
  },
}));

describe("scan provider selection", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it("prefers Anthropic when both providers are configured", () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "anthropic-test-key");
    vi.stubEnv("GOOGLE_API_KEY", "google-test-key");
    vi.stubEnv("GEMINI_API_KEY", "");

    expect(getConfiguredScanProvider()).toBe("anthropic");
    expect(hasConfiguredScanProvider()).toBe(true);
  });

  it("uses Gemini when Anthropic is not configured", () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    vi.stubEnv("GOOGLE_API_KEY", "google-test-key");
    vi.stubEnv("GEMINI_API_KEY", "");

    expect(getConfiguredScanProvider()).toBe("gemini");
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
});
