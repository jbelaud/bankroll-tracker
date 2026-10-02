import "server-only";
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
  const actionKey = JSON.stringify([partner.id, reward.campaignId, input.validatedActionId]);
  const entitlementKey = JSON.stringify([partner.id, reward.campaignId]);
  return prisma.$transaction(async (tx) => {
    const result = await grantScanBatchInTransaction(tx, {
      userId: input.userId, type: "PARTNER", origin: partner.name,
      partnerId: partner.id, campaignId: reward.campaignId, quantity: reward.quantity,
      grantKey: `partner-action:${actionKey}`, entitlementKey: `partner-offer:${entitlementKey}`,
      expiresAt: reward.expiresAfterDays === null ? null : new Date(now.getTime() + reward.expiresAfterDays * 86_400_000),
      stackable: reward.stackable, conditions: reward.conditions.fr,
    });
    if (result.created) {
      await tx.growthEvent.create({ data: { userId: input.userId, name: "scan_reward_validated",
        properties: { credit_type: "partner", partner_id: partner.id,
          campaign_id: reward.campaignId, scans_count: reward.quantity } } });
    }
    return result;
  });
}
