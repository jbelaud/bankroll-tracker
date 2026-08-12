import { createHash } from "crypto";

export function hashBetaInviteToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function normalizeBetaInviteEmail(value: string | null | undefined): string | null {
  const normalized = value?.trim().toLowerCase() ?? "";
  return normalized && normalized.length <= 320 ? normalized : null;
}
