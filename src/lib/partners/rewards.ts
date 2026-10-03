import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { grantScanBatchInTransaction } from "@/lib/scan/credit-wallet";
import { PARTNER_CATALOGUE, partnerIsActive, validPartnerScanReward } from "./catalogue";

// Adaptateur interne pour un futur webhook authentifié ou une validation admin.
// L'appelant doit vérifier la preuve et le bénéficiaire ; aucun clic public ne
// vaut validation. Quantité et conditions viennent exclusivement du catalogue.
export async function grantValidatedPartnerScans(input: {
  userId: string;
  partnerId: string;
  campaignId: string;
  validatedActionId: string;
}) {
  const partner = PARTNER_CATALOGUE.find((p) => p.id === input.partnerId);
  const reward = partner?.scanReward;
  const now = new Date();
  if (!partner || !partnerIsActive(partner, now) || !reward || reward.campaignId !== input.campaignId) {
    throw new Error("Aucune récompense de scans active et confirmée pour cette offre.");
  }
  if (!input.userId.trim() || !input.validatedActionId.trim()) throw new Error("Validation partenaire incomplète.");
  if (!validPartnerScanReward(reward)) {
    throw new Error("Configuration de la récompense invalide.");
  }
  return prisma.$transaction((tx) => grantPartnerRewardInTransaction(tx, {
    ...input, quantity: reward.quantity, origin: partner.name, conditions: reward.conditions.fr, stackable: reward.stackable,
    expiresAt: reward.expiresAfterDays === null ? null : new Date(now.getTime() + reward.expiresAfterDays * 86_400_000),
  }));
}

// Réservé aux services serveur : l'entrée vient du catalogue ou d'une demande persistée.
export async function grantPartnerRewardInTransaction(tx: Prisma.TransactionClient, input: {
  userId: string; partnerId: string; campaignId: string; validatedActionId: string;
  quantity: number; origin: string; conditions: string; expiresAt: Date | null; stackable?: boolean;
}) {
  const actionKey = JSON.stringify([input.partnerId, input.campaignId, input.validatedActionId]);
  const entitlementKey = JSON.stringify([input.partnerId, input.campaignId]);
  const result = await grantScanBatchInTransaction(tx, {
    userId: input.userId, type: "PARTNER", origin: input.origin,
    partnerId: input.partnerId, campaignId: input.campaignId, quantity: input.quantity,
    grantKey: `partner-action:${actionKey}`, entitlementKey: `partner-offer:${entitlementKey}`,
    expiresAt: input.expiresAt, stackable: input.stackable ?? true, conditions: input.conditions,
  });
  if (result.created) {
    await tx.growthEvent.create({ data: { userId: input.userId, name: "scan_reward_validated",
      properties: { credit_type: "partner", partner_id: input.partnerId,
        campaign_id: input.campaignId, scans_count: input.quantity } } });
  }
  return result;
}
