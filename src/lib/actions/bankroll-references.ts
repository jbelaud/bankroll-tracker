"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isBankrollLockedForUser } from "@/lib/billing/bankroll-access";
import { unitSnapshot } from "@/lib/bankroll-units";

export type ReferenceActionState = { error?: string; success?: string };

/** Explicit owner declaration for missing historical units; never overwrite a snapshot. */
export async function reconcileReference(_state: ReferenceActionState, form: FormData): Promise<ReferenceActionState> {
  const user = await requireUser();
  const bankrollId = String(form.get("bankrollId") ?? "");
  const startRaw = String(form.get("from") ?? "");
  const endRaw = String(form.get("to") ?? "");
  if (![startRaw, endRaw].every((value) => /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value))) return { error: "Dates invalides." };
  const start = new Date(`${startRaw}:00Z`);
  const end = new Date(`${endRaw}:00Z`);
  const capital = Number(form.get("referenceCapital"));
  if (![start.getTime(), end.getTime(), capital].every(Number.isFinite) || start >= end || capital <= 0 || end > new Date()) {
    return { error: "Vérifie le montant et les dates : la fin doit suivre le début et ne pas être dans le futur." };
  }
  if (start.toISOString().slice(0, 16) !== startRaw || end.toISOString().slice(0, 16) !== endRaw) return { error: "Dates invalides." };
  const owned = await prisma.bankroll.findFirst({ where: { id: bankrollId, userId: user.id }, select: { id: true } });
  if (!owned || await isBankrollLockedForUser(user.id, bankrollId)) return { error: "Bankroll inaccessible." };
  if (form.get("confirmed") !== "on") return { error: "Confirme que ce montant était bien ta référence sur cette période." };
  const count = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM bankrolls WHERE id = ${bankrollId} FOR UPDATE`;
    const bets = await tx.bet.findMany({
      where: { bankrollId, referenceCapitalAtBet: null, date: { gte: start, lt: end } },
      select: { id: true, stake: true, date: true },
    });
    const recordedAt = new Date();
    for (const bet of bets) {
      await tx.bet.update({ where: { id: bet.id }, data: unitSnapshot(bet.stake, [{ referenceCapital: capital, effectiveFrom: start }], bet.date, recordedAt) });
    }
    return bets.length;
  }, { timeout: 30000 });
  revalidatePath("/[locale]/bankrolls/[id]", "page");
  revalidatePath("/[locale]/history", "page");
  revalidatePath("/[locale]/dashboard", "page");
  revalidatePath("/[locale]/tipsters/[id]", "page");
  return { success: `${count} pari(s) réconcilié(s). Les unités déjà connues ont été conservées.` };
}
