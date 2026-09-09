import { describe, expect, it } from "vitest";
import { normalizePublicHandle, normalizeXHandle, validPublicAvatarUrl, validPublicHandle, validXHandle } from "./public-tipster-profile";

describe("public tipster profile", () => {
  it("normalise et valide l’identifiant Kalivoa", () => {
    expect(normalizePublicHandle("  @Jeremy_Bets ")).toBe("jeremy_bets");
    expect(validPublicHandle("jeremy_bets")).toBe(true);
    expect(validPublicHandle("j! ")).toBe(false);
  });
  it("accepte un pseudo ou une URL X", () => {
    expect(normalizeXHandle("https://x.com/Jeremy_Bets")).toBe("jeremy_bets");
    expect(validXHandle(normalizeXHandle("@Jeremy_Bets"))).toBe(true);
    expect(validXHandle(normalizeXHandle("pseudo-trop-long-et-invalide"))).toBe(false);
  });
  it("refuse les avatars non sécurisés", () => {
    expect(validPublicAvatarUrl("https://images.example.com/avatar.png")).toBe(true);
    expect(validPublicAvatarUrl("http://images.example.com/avatar.png")).toBe(false);
  });
});
