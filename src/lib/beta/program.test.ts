import { describe, expect, it } from "vitest";
import { hashBetaInviteToken, normalizeBetaInviteEmail } from "./invite-token";

describe("beta invitation token helpers", () => {
  it("stores a deterministic one-way token hash instead of the raw invitation", () => {
    const token = "private-invite-token";
    expect(hashBetaInviteToken(token)).toHaveLength(64);
    expect(hashBetaInviteToken(token)).toBe(hashBetaInviteToken(token));
    expect(hashBetaInviteToken(token)).not.toContain(token);
  });

  it("normalizes an optional email lock before validating an invitation", () => {
    expect(normalizeBetaInviteEmail("  Test@Example.com ")).toBe("test@example.com");
    expect(normalizeBetaInviteEmail("   ")).toBeNull();
  });
});
