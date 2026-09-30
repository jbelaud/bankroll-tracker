import { describe, expect, it } from "vitest";
import manifest from "../manifest.json";
describe("production extension manifest", () => {
  it("uses MV3 with only temporary page capture permissions", () => {
    expect(manifest.manifest_version).toBe(3);
    expect(manifest.permissions).toEqual(["activeTab", "scripting"]);
    expect(manifest).not.toHaveProperty("host_permissions");
    expect(manifest).not.toHaveProperty("content_scripts");
  });
  it("restricts website connections to Kalivoa and bundles its worker locally", () => {
    expect(manifest.externally_connectable.matches).toEqual(["https://kalivoa.com/*"]);
    expect(manifest.background.service_worker).toBe("background.js");
    expect(manifest.commands.capture.suggested_key.default).toBe("Alt+Shift+K");
  });
});
