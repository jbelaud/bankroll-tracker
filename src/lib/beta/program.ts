import "server-only";

import { prisma } from "@/lib/prisma";
import { hashBetaInviteToken, normalizeBetaInviteEmail } from "./invite-token";

export { BETA_INVITE_DURATION_DAYS, BETA_INVITE_TOKEN_BYTES, DEFAULT_BETA_CAMPAIGN_MAX_REDEMPTIONS, MAX_BETA_CAMPAIGN_MAX_REDEMPTIONS } from "./constants";
// 128 bits d'entropie : 22 caractères base64url, tout en restant impossible
// à deviner dans le cadre de liens valables 14 jours.

export { hashBetaInviteToken, normalizeBetaInviteEmail } from "./invite-token";

export async function isBetaPhaseActive(): Promise<boolean> {
  const program = await prisma.betaProgram.findUnique({ where: { id: "global" }, select: { phase: true } });
  return program?.phase !== "ENDED";
}

export async function isBetaInviteTokenValid(token: string | null, emailInput: string): Promise<boolean> {
  if (!token || token.length > 200 || !(await isBetaPhaseActive())) return false;
  const email = normalizeBetaInviteEmail(emailInput);
  const invite = await prisma.betaInvite.findUnique({
    where: { tokenHash: hashBetaInviteToken(token) },
    select: { email: true, expiresAt: true, revokedAt: true, maxRedemptions: true, redemptionCount: true },
  });
  return Boolean(
    invite &&
    !invite.revokedAt &&
    invite.redemptionCount < invite.maxRedemptions &&
    invite.expiresAt > new Date() &&
    (!invite.email || invite.email === email)
  );
}

export async function redeemBetaInvite(token: string | null, user: { id: string; email?: string | null }) {
  if (!token || token.length > 200 || !(await isBetaPhaseActive())) return false;

  const tokenHash = hashBetaInviteToken(token);
  const email = normalizeBetaInviteEmail(user.email);
  const now = new Date();
  const invite = await prisma.betaInvite.findUnique({ where: { tokenHash }, select: { id: true, email: true } });
  if (!invite || (invite.email && invite.email !== email)) return false;

  return prisma.$transaction(async (tx) => {
    // Une incrémentation conditionnelle au niveau SQL évite de dépasser le
    // plafond si plusieurs personnes ouvrent le lien en même temps.
    const claimed = await tx.$queryRaw<{ id: string }[]>`
      UPDATE "beta_invites"
      SET "redemptionCount" = "redemptionCount" + 1
      WHERE "id" = ${invite.id}
        AND "revokedAt" IS NULL
        AND "expiresAt" > ${now}
        AND "redemptionCount" < "maxRedemptions"
      RETURNING "id"
    `;
    if (claimed.length !== 1) return false;

    const assigned = await tx.user.updateMany({
      where: { id: user.id, plan: "FREE" },
      data: { plan: "BETA_TESTER" },
    });
    if (assigned.count === 1) {
      await tx.betaInviteRedemption.create({ data: { betaInviteId: invite.id, userId: user.id, redeemedAt: now } });
      return true;
    }

    // Un abonnement existant reste prioritaire : l'invitation est libérée
    // afin qu'elle ne soit pas consommée par un compte non éligible.
    await tx.betaInvite.update({ where: { id: invite.id }, data: { redemptionCount: { decrement: 1 } } });
    return false;
  });
}
