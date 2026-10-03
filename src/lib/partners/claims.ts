import "server-only";
import { Prisma, type PartnerReferralClaim } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { lockScanWalletUsers } from "@/lib/scan/credit-wallet";
import { PARTNER_CATALOGUE, partnerIsActive, validPartnerScanReward } from "./catalogue";
import { ClaimError, type parseClaimSubmission, type parseClaimReview } from "./claim-validation";
import type { AdminPartnerClaim, ClaimStatus, MemberPartnerClaim } from "./claims-types";
import { grantPartnerRewardInTransaction } from "./rewards";

export function memberClaim(claim: PartnerReferralClaim): MemberPartnerClaim {
  return { id: claim.id, partnerId: claim.partnerId, partnerName: claim.partnerName, status: claim.status,
    revision: claim.revision, bookmakerUsername: claim.bookmakerUsername, registrationDate: claim.registrationDate.toISOString().slice(0, 10),
    memberNote: claim.memberNote, reviewMessage: claim.reviewMessage, rewardQuantity: claim.rewardQuantity, createdAt: claim.createdAt.toISOString() };
}

export async function listMemberPartnerClaims(userId: string) {
  return (await prisma.partnerReferralClaim.findMany({ where: { userId }, orderBy: { createdAt: "desc" } })).map(memberClaim);
}

export async function submitPartnerClaim(userId: string, locale: "fr" | "en", input: ReturnType<typeof parseClaimSubmission>) {
  return prisma.$transaction(async (tx) => {
    await lockScanWalletUsers(tx, [userId]);
    if (input.claimId) {
      const claim = await tx.partnerReferralClaim.findFirst({ where: { id: input.claimId, userId, partnerId: input.partnerId } });
      if (!claim) throw new ClaimError("notFound");
      if (claim.status !== "NEEDS_INFO" || claim.revision !== input.revision) throw new ClaimError("staleRequest");
      if (claim.offerExpiresAt && input.registrationDate > claim.offerExpiresAt) throw new ClaimError("invalidForm");
      const updated = await tx.partnerReferralClaim.update({ where: { id: claim.id }, data: {
        bookmakerUsername: input.bookmakerUsername, registrationDate: input.registrationDate, memberNote: input.memberNote,
        status: "PENDING", revision: { increment: 1 }, reviewMessage: null, reviewedAt: null, reviewerId: null,
      } });
      await tx.partnerReferralClaimEvent.create({ data: { claimId: claim.id, actorId: userId, status: "PENDING",
        message: JSON.stringify({ bookmakerUsername: input.bookmakerUsername, registrationDate: input.registrationDate.toISOString().slice(0, 10), note: input.memberNote }) } });
      return updated;
    }
    const partner = PARTNER_CATALOGUE.find((p) => p.id === input.partnerId);
    const reward = partner?.scanReward;
    if (!partner || partner.section !== "bookmakers" || !partnerIsActive(partner, new Date()) || !reward || !validPartnerScanReward(reward) || reward.expiresAfterDays !== null) throw new ClaimError("offerUnavailable");
    const entitlementKey = `partner-offer:${JSON.stringify([partner.id, reward.campaignId])}`;
    const existingReward = await tx.scanCreditBatch.findFirst({ where: { userId, entitlementKey } });
    if (existingReward) throw new ClaimError("alreadyRewarded");
    const existingClaim = await tx.partnerReferralClaim.findUnique({ where: { userId_partnerId_campaignId: { userId, partnerId: partner.id, campaignId: reward.campaignId } } });
    if (existingClaim) throw new ClaimError("alreadySubmitted");
    const claim = await tx.partnerReferralClaim.create({ data: {
      userId, locale, partnerId: partner.id, campaignId: reward.campaignId, partnerName: partner.name,
      rewardQuantity: reward.quantity, rewardConditions: reward.conditions[locale],
      offerExpiresAt: partner.offerExpiresAt ? new Date(partner.offerExpiresAt) : null,
      bookmakerUsername: input.bookmakerUsername, registrationDate: input.registrationDate, memberNote: input.memberNote,
    } });
    await tx.partnerReferralClaimEvent.create({ data: { claimId: claim.id, actorId: userId, status: "PENDING",
      message: JSON.stringify({ bookmakerUsername: input.bookmakerUsername, registrationDate: input.registrationDate.toISOString().slice(0, 10), note: input.memberNote }) } });
    return claim;
  }, { maxWait: 15_000, timeout: 15_000 });
}

export async function reviewPartnerClaim(adminId: string, input: ReturnType<typeof parseClaimReview>) {
  return prisma.$transaction(async (tx) => {
    // Ordre de verrouillage commun au portefeuille et aux modifications membres.
    const owner = await tx.partnerReferralClaim.findUnique({ where: { id: input.claimId }, select: { userId: true } });
    if (!owner) throw new ClaimError("notFound");
    await lockScanWalletUsers(tx, [owner.userId]);
    const claim = await tx.partnerReferralClaim.findUniqueOrThrow({ where: { id: input.claimId } });
    // Un double clic sur la même validation ne crée ni scans ni email supplémentaires.
    if (claim.status === "APPROVED" && input.decision === "APPROVED") return claim;
    if (claim.status !== "PENDING" || claim.revision !== input.revision) throw new ClaimError("staleRequest");
    let rewardBatchId: string | undefined;
    if (input.decision === "APPROVED") {
      // Récompense figée à la déclaration : la fin de l'offre ne pénalise pas une vérification tardive.
      const reward = await grantPartnerRewardInTransaction(tx, {
        userId: claim.userId, partnerId: claim.partnerId, campaignId: claim.campaignId,
        validatedActionId: claim.id, quantity: claim.rewardQuantity, origin: claim.partnerName,
        conditions: claim.rewardConditions, expiresAt: null,
      });
      if (reward.batch.status === "REVOKED" || reward.batch.quantityGranted !== claim.rewardQuantity) throw new ClaimError("alreadyRewarded");
      rewardBatchId = reward.batch.id;
      const user = await tx.user.findUniqueOrThrow({ where: { id: claim.userId }, select: { email: true } });
      await tx.partnerRewardEmail.create({ data: { claimId: claim.id, recipient: user.email } });
    }
    const updated = await tx.partnerReferralClaim.update({ where: { id: claim.id }, data: {
      status: input.decision, revision: { increment: 1 }, reviewMessage: input.reviewMessage,
      reviewerId: adminId, reviewedAt: new Date(), rewardBatchId,
    } });
    await tx.partnerReferralClaimEvent.create({ data: { claimId: claim.id, actorId: adminId, status: input.decision, message: input.reviewMessage } });
    return updated;
  }, { maxWait: 15_000, timeout: 15_000 });
}

export async function getAdminPartnerClaims(status: ClaimStatus | "ALL", page: number) {
  const where: Prisma.PartnerReferralClaimWhereInput = status === "ALL" ? {} : { status };
  const [total, pendingCount, rows] = await prisma.$transaction([
    prisma.partnerReferralClaim.count({ where }),
    prisma.partnerReferralClaim.count({ where: { status: "PENDING" } }),
    prisma.partnerReferralClaim.findMany({ where, orderBy: { createdAt: "desc" }, take: 20, skip: (page - 1) * 20,
      include: { user: { select: { email: true, name: true } }, rewardEmail: { select: { status: true } }, events: { orderBy: { createdAt: "asc" } } } }),
  ]);
  const claims: AdminPartnerClaim[] = rows.map((claim) => ({ ...memberClaim(claim), memberEmail: claim.user.email, memberName: claim.user.name,
    reviewedAt: claim.reviewedAt?.toISOString() ?? null, emailStatus: claim.rewardEmail?.status ?? null,
    events: claim.events.map((event) => ({ id: event.id, status: event.status, message: event.message, createdAt: event.createdAt.toISOString() })) }));
  return { claims, total, pendingCount };
}
