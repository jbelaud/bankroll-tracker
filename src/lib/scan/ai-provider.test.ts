import { afterEach, describe, expect, it, vi } from "vitest";
import { getConfiguredScanProvider, hasConfiguredScanProvider } from "./ai-provider";

describe("scan provider selection", () => {
  afterEach(() => vi.unstubAllEnvs());

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
});
