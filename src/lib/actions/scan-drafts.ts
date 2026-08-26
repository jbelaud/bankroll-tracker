"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { isBankrollLockedForUser } from "@/lib/billing/bankroll-access";
import { prisma } from "@/lib/prisma";
import type { ScanTicketResult } from "@/lib/scan/scan-client";
import type { ParsedBet } from "@/lib/scan/types";

export type ScanDraftPayload = {
  bets: ParsedBet[];
  excludedIndexes: number[];
  scans: ScanTicketResult[];
  skippedDuplicateFiles: string[];
};

export type PendingScanDraft = {
  id: string;
  bankrollId: string;
  bankrollName: string;
  updatedAt: string;
  betCount: number;
  payload: ScanDraftPayload;
};

function ensureSerializablePayload(payload: ScanDraftPayload): Prisma.InputJsonValue {
  if (!Array.isArray(payload.bets) || payload.bets.length === 0 || payload.bets.length > 150) {
    throw new Error("Le brouillon de scan est invalide.");
  }

  // Le brouillon ne sauvegarde volontairement que les données structurées de
  // revue. Les objets File et leurs captures ne peuvent pas être sérialisés.
  const safePayload = {
    bets: payload.bets,
    excludedIndexes: Array.from(new Set(payload.excludedIndexes.filter((index) => Number.isInteger(index) && index >= 0 && index < payload.bets.length))).sort((a, b) => a - b),
    scans: payload.scans,
    skippedDuplicateFiles: payload.skippedDuplicateFiles.filter((name) => typeof name === "string").slice(0, 10),
  };

  try {
    return JSON.parse(JSON.stringify(safePayload)) as Prisma.InputJsonValue;
  } catch {
    throw new Error("Le brouillon de scan ne peut pas être sauvegardé.");
  }
}

async function assertOwnedActiveBankroll(userId: string, bankrollId: string) {
  const bankroll = await prisma.bankroll.findFirst({
    where: { id: bankrollId, userId },
    select: { id: true, name: true },
  });
  if (!bankroll || await isBankrollLockedForUser(userId, bankrollId)) {
    throw new Error("Cette bankroll est introuvable ou verrouillée.");
  }
  return bankroll;
}

export async function createScanDraft(bankrollId: string, payload: ScanDraftPayload) {
  const user = await requireUser();
  await assertOwnedActiveBankroll(user.id, bankrollId);
  const draft = await prisma.scanDraft.create({
    data: { userId: user.id, bankrollId, payload: ensureSerializablePayload(payload) },
    select: { id: true },
  });
  revalidatePath("/[locale]/scan", "page");
  return draft.id;
}

export async function updateScanDraft(draftId: string, bankrollId: string, payload: ScanDraftPayload) {
  const user = await requireUser();
  await assertOwnedActiveBankroll(user.id, bankrollId);
  const updated = await prisma.scanDraft.updateMany({
    where: { id: draftId, userId: user.id },
    data: { bankrollId, payload: ensureSerializablePayload(payload) },
  });
  if (updated.count !== 1) throw new Error("Ce brouillon d'import est introuvable.");
  revalidatePath("/[locale]/scan", "page");
}

export async function deleteScanDraft(draftId: string) {
  const user = await requireUser();
  await prisma.scanDraft.deleteMany({ where: { id: draftId, userId: user.id } });
  revalidatePath("/[locale]/scan", "page");
}

export async function listPendingScanDrafts(): Promise<PendingScanDraft[]> {
  const user = await requireUser();
  const drafts = await prisma.scanDraft.findMany({
    where: { userId: user.id },
    include: { bankroll: { select: { name: true } } },
    orderBy: { updatedAt: "desc" },
    take: 20,
  });

  const unlockedDrafts = await Promise.all(drafts.map(async (draft) => ({
    draft,
    locked: await isBankrollLockedForUser(user.id, draft.bankrollId),
  })));

  return unlockedDrafts.flatMap(({ draft, locked }) => {
    if (locked) return [];
    const payload = draft.payload as Partial<ScanDraftPayload>;
    if (!Array.isArray(payload.bets) || !Array.isArray(payload.scans)) return [];
    return [{
      id: draft.id,
      bankrollId: draft.bankrollId,
      bankrollName: draft.bankroll.name,
      updatedAt: draft.updatedAt.toISOString(),
      betCount: payload.bets.length,
      payload: {
        bets: payload.bets as ParsedBet[],
        excludedIndexes: Array.isArray(payload.excludedIndexes) ? payload.excludedIndexes.filter(Number.isInteger) : [],
        scans: payload.scans as ScanTicketResult[],
        skippedDuplicateFiles: Array.isArray(payload.skippedDuplicateFiles) ? payload.skippedDuplicateFiles.filter((name): name is string => typeof name === "string") : [],
      },
    }];
  });
}
