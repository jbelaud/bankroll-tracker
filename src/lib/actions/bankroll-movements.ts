"use server";

import type { BankrollMovementType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/auth";
import { summarizeBankrollCapital } from "@/lib/bankroll-balance";
import { getServerLocale } from "@/lib/i18n/get-server-locale";
import { prisma } from "@/lib/prisma";
import { isBankrollLockedForUser } from "@/lib/billing/bankroll-access";

function isMovementType(value: string): value is BankrollMovementType {
  return value === "DEPOSIT" || value === "WITHDRAWAL";
}

async function refreshMovementViews(bankrollId: string) {
  const locale = await getServerLocale();
  revalidatePath(`/${locale}/bankrolls/${bankrollId}`);
  revalidatePath(`/${locale}/bankrolls`);
  revalidatePath(`/${locale}/dashboard`);
  revalidatePath(`/${locale}/stats`);
}

export async function listBankrollMovements(bankrollId: string) {
  const user = await requireUser();
  const bankroll = await prisma.bankroll.findFirst({ where: { id: bankrollId, userId: user.id }, select: { id: true } });
  if (!bankroll) throw new Error((await getTranslations({ locale: await getServerLocale(), namespace: "errors" }))("bankrollNotFound"));
  if (await isBankrollLockedForUser(user.id, bankrollId)) {
    throw new Error((await getTranslations({ locale: await getServerLocale(), namespace: "errors" }))("bankrollLocked"));
  }

  return prisma.bankrollMovement.findMany({ where: { bankrollId }, orderBy: [{ date: "desc" }, { createdAt: "desc" }] });
}

export async function listAllBankrollMovements() {
  const user = await requireUser();
  return prisma.bankrollMovement.findMany({
    where: { bankroll: { userId: user.id } },
    orderBy: [{ date: "asc" }, { createdAt: "asc" }],
  });
}

export async function createBankrollMovement(
  bankrollId: string,
  type: string,
  amount: number,
  note: string,
  date: Date,
  allocationId: string | null = null
) {
  const user = await requireUser();
  const t = await getTranslations({ locale: await getServerLocale(), namespace: "errors" });
  if (!isMovementType(type)) throw new Error(t("invalidMovementType"));
  if (!Number.isFinite(amount) || amount <= 0) throw new Error(t("movementAmountPositive"));
  if (Number.isNaN(date.getTime())) throw new Error(t("movementDateInvalid"));

  const bankroll = await prisma.bankroll.findFirst({
    where: { id: bankrollId, userId: user.id },
    include: { bets: true, movements: true, allocations: true },
  });
  if (!bankroll) throw new Error(t("bankrollNotFound"));
  if (await isBankrollLockedForUser(user.id, bankrollId)) throw new Error(t("bankrollLocked"));
  const allocation = allocationId ? bankroll.allocations.find((item) => item.id === allocationId) : null;
  if (allocationId && !allocation) throw new Error(t("bankrollNotFound"));
  if (bankroll.mode === "DISTRIBUTED" && bankroll.allocations.length > 1 && !allocation) throw new Error(t("movementAllocationRequired"));

  const current = allocation
    ? summarizeBankrollCapital(
        { id: bankroll.id, initial: allocation.initial },
        bankroll.bets.filter((bet) => bet.allocationId === allocation.id),
        bankroll.movements.filter((movement) => movement.allocationId === allocation.id)
      ).balance
    : summarizeBankrollCapital(bankroll, bankroll.bets, bankroll.movements).balance;
  if (type === "WITHDRAWAL" && amount > current) throw new Error(t("withdrawalExceedsBalance"));

  const movement = await prisma.bankrollMovement.create({
    data: { bankrollId, allocationId: allocation?.id ?? (bankroll.allocations.length === 1 ? bankroll.allocations[0].id : null), type, amount, note: note.trim().slice(0, 280) || null, date },
  });
  await refreshMovementViews(bankrollId);
  return movement;
}

export async function deleteBankrollMovement(movementId: string) {
  const user = await requireUser();
  const movement = await prisma.bankrollMovement.findFirst({
    where: { id: movementId, bankroll: { userId: user.id } },
    select: { id: true, bankrollId: true },
  });
  if (!movement) throw new Error((await getTranslations({ locale: await getServerLocale(), namespace: "errors" }))("movementNotFound"));
  if (await isBankrollLockedForUser(user.id, movement.bankrollId)) {
    throw new Error((await getTranslations({ locale: await getServerLocale(), namespace: "errors" }))("bankrollLocked"));
  }
  await prisma.bankrollMovement.delete({ where: { id: movement.id } });
  await refreshMovementViews(movement.bankrollId);
}
