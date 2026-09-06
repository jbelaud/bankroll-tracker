"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isBankrollLockedForUser } from "@/lib/billing/bankroll-access";
import { unitSnapshot } from "@/lib/bankroll-units";

export type ReferenceActionState = { error?: string; success?: string };

async function fillMissingUnits(bankrollId: string, capital: number, where: { date?: { gte: Date; lt: Date } } = {}) {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM bankrolls WHERE id = ${bankrollId} FOR UPDATE`;
    const bets = await tx.bet.findMany({
      where: { bankrollId, referenceCapitalAtBet: null, ...where },
      select: { id: true, stake: true, date: true },
    });
    const recordedAt = new Date();
    const effectiveFrom = where.date?.gte ?? new Date(0);
    for (const bet of bets) {
      await tx.bet.update({ where: { id: bet.id }, data: unitSnapshot(bet.stake, [{ referenceCapital: capital, effectiveFrom }], bet.date, recordedAt) });
    }
    return bets.length;
  }, { timeout: 30000 });
}

function refreshReferenceViews() {
  revalidatePath("/[locale]/bankrolls/[id]", "page");
  revalidatePath("/[locale]/history", "page");
  revalidatePath("/[locale]/dashboard", "page");
  revalidatePath("/[locale]/tipsters/[id]", "page");
}

export async function reconcileAllReferences(_state: ReferenceActionState, form: FormData): Promise<ReferenceActionState> {
  const user = await requireUser();
  const bankrollId = String(form.get("bankrollId") ?? "");
  const capital = Number(form.get("referenceCapital"));
  if (!Number.isFinite(capital) || capital <= 0) return { error: "Renseigne un montant de référence valide." };
  const owned = await prisma.bankroll.findFirst({ where: { id: bankrollId, userId: user.id }, select: { id: true } });
  if (!owned || await isBankrollLockedForUser(user.id, bankrollId)) return { error: "Bankroll inaccessible." };
  if (form.get("confirmed") !== "on") return { error: "Confirme que tous ces anciens paris utilisaient cette référence." };
  const count = await fillMissingUnits(bankrollId, capital);
  refreshReferenceViews();
  return { success: `${count} ancien(s) pari(s) converti(s).` };
}

/** Explicit owner declaration for missing historical units; never overwrite a snapshot. */
export async function reconcileReference(_state: ReferenceActionState, form: FormData): Promise<ReferenceActionState> {
  const user = await requireUser();
  const bankrollId = String(form.get("bankrollId") ?? "");
  const startRaw = String(form.get("from") ?? "");
  const endRaw = String(form.get("to") ?? "");
  if (![startRaw, endRaw].every((value) => /^\d{4}-\d{2}-\d{2}$/.test(value))) return { error: "Dates invalides." };
  const start = new Date(`${startRaw}T00:00:00Z`);
  const inclusiveEnd = new Date(`${endRaw}T00:00:00Z`);
  const end = new Date(inclusiveEnd.getTime() + 24 * 60 * 60 * 1000);
  const capital = Number(form.get("referenceCapital"));
  const today = new Date();
  const todayUtc = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  if (![start.getTime(), inclusiveEnd.getTime(), end.getTime(), capital].every(Number.isFinite)
    || start > inclusiveEnd || capital <= 0 || inclusiveEnd > todayUtc) {
    return { error: "Vérifie le montant et les dates : la fin doit suivre le début et ne pas être dans le futur." };
  }
  if (start.toISOString().slice(0, 10) !== startRaw || inclusiveEnd.toISOString().slice(0, 10) !== endRaw) return { error: "Dates invalides." };
  const owned = await prisma.bankroll.findFirst({ where: { id: bankrollId, userId: user.id }, select: { id: true } });
  if (!owned || await isBankrollLockedForUser(user.id, bankrollId)) return { error: "Bankroll inaccessible." };
  if (form.get("confirmed") !== "on") return { error: "Confirme que ce montant était bien ta référence sur cette période." };
  const count = await fillMissingUnits(bankrollId, capital, { date: { gte: start, lt: end } });
  refreshReferenceViews();
  return { success: `${count} pari(s) réconcilié(s). Les unités déjà connues ont été conservées.` };
}
