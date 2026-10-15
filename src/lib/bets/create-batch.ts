import "server-only";

import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { isBankrollLockedForUser } from "@/lib/billing/bankroll-access";
import { getUserTaxonomy, saveUserTaxonomyEntries, type Taxonomy } from "@/lib/taxonomy";
import {
  ownedBetData, ownedBetSelections, ownedBetTaxonomyEntries, prepareOwnedBet,
  type BetValidationMessages, type CreateOwnedBetInput,
} from "./create";

/** One bankroll lock and one set of shared reads, regardless of batch size. */
export async function createOwnedBets(
  userId: string,
  inputs: CreateOwnedBetInput[],
  messages: BetValidationMessages,
  options: { bankrollValidated?: boolean; taxonomy?: Taxonomy } = {}
): Promise<number> {
  if (!inputs.length) return 0;
  const bankrollId = inputs[0].bankrollId;
  if (inputs.some((input) => input.bankrollId !== bankrollId)) throw new Error(messages.bankrollNotFound);
  if (!options.bankrollValidated) {
    const bankroll = await prisma.bankroll.findFirst({ where: { id: bankrollId, userId }, select: { id: true } });
    if (!bankroll) throw new Error(messages.bankrollNotFound);
    if (await isBankrollLockedForUser(userId, bankrollId)) throw new Error(messages.bankrollLocked);
  }
  const allocationIds = [...new Set(inputs.flatMap((input) => input.allocationId ? [input.allocationId] : []))];
  if (allocationIds.length) {
    const allocations = await prisma.bankrollAllocation.findMany({
      where: { id: { in: allocationIds }, bankrollId, bankroll: { userId } }, select: { id: true },
    });
    if (allocations.length !== allocationIds.length) throw new Error(messages.bankrollNotFound);
  }
  const taxonomy = options.taxonomy ?? await getUserTaxonomy(userId, false);
  const prepared = inputs.map((input) => prepareOwnedBet(input, messages, taxonomy));
  const scanIds = [...new Set(inputs.flatMap((input) => input.source?.scanUsageId ? [input.source.scanUsageId] : []))];

  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM bankrolls WHERE id = ${bankrollId} FOR UPDATE`;
    const bankrollState = await tx.bankroll.findUniqueOrThrow({
      where: { id: bankrollId },
      select: { isPublic: true, certificationStartedAt: true, currency: true, referenceCurrency: true },
    });
    const periods = await tx.bankrollReferencePeriod.findMany({ where: { bankrollId } });
    const scans = scanIds.length ? await tx.scanUsage.findMany({
      where: { id: { in: scanIds }, userId, outcome: "READY" }, select: { id: true, createdAt: true },
    }) : [];
    if (scans.length !== scanIds.length) throw new Error("Un Scan associé à cet import est introuvable.");
    const scanById = new Map(scans.map((scan) => [scan.id, scan]));
    const recordedAt = new Date();
    // Calculate and validate every conversion before the first INSERT.
    const rows = inputs.map((input, index) => ({
      ...ownedBetData(input, prepared[index], bankrollState, periods,
        input.source?.scanUsageId ? scanById.get(input.source.scanUsageId) ?? null : null, recordedAt),
      id: randomUUID(),
    }));
    // Bound statement size for large histories and tickets with many legs.
    for (let start = 0; start < rows.length; start += 200) {
      await tx.bet.createMany({ data: rows.slice(start, start + 200) });
    }
    const selections = prepared.flatMap((item, index) => ownedBetSelections(item, rows[index].id));
    for (let start = 0; start < selections.length; start += 500) {
      await tx.betSelection.createMany({ data: selections.slice(start, start + 500) });
    }
    await saveUserTaxonomyEntries(userId, prepared.flatMap(ownedBetTaxonomyEntries), tx);
    return rows.length;
  }, { timeout: 15_000 });
}
