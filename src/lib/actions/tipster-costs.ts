"use server";

import { Prisma, type TipsterCostFrequency } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const FREQUENCIES = ["ONE_TIME", "WEEKLY", "MONTHLY", "QUARTERLY", "YEARLY"] as const;

export type TipsterCostInput = {
  kind: "FREE" | "PAID";
  amount?: number | null;
  frequency?: TipsterCostFrequency | null;
  startDate: string;
  endDate?: string | null;
};

export type TipsterCostMutationError =
  | "TIPSTER_NOT_FOUND"
  | "INVALID_DATE"
  | "INVALID_AMOUNT"
  | "INVALID_FREQUENCY"
  | "START_BEFORE_CURRENT"
  | "NO_COST_PERIOD";

export type TipsterCostMutationResult =
  | { success: true }
  | { success: false; error: TipsterCostMutationError };

function parseDateOnly(value: string | null | undefined): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value
    ? null
    : parsed;
}

function previousUtcDay(value: Date): Date {
  return new Date(value.getTime() - 86_400_000);
}

function revalidateTipsterCostViews() {
  revalidatePath("/[locale]/tipsters", "page");
  revalidatePath("/[locale]/tipsters/[id]", "page");
  revalidatePath("/[locale]/stats", "page");
}

export async function setTipsterCostPeriod(
  tipsterId: string,
  input: TipsterCostInput
): Promise<TipsterCostMutationResult> {
  const user = await requireUser();
  const owned = await prisma.tipster.findFirst({
    where: { id: tipsterId, userId: user.id },
    select: { id: true, user: { select: { currency: true } } },
  });
  if (!owned) return { success: false, error: "TIPSTER_NOT_FOUND" };

  const startDate = parseDateOnly(input.startDate);
  const endDate = input.endDate ? parseDateOnly(input.endDate) : null;
  if (!startDate || (input.endDate && !endDate) || (endDate && endDate < startDate)) {
    return { success: false, error: "INVALID_DATE" };
  }

  const paid = input.kind === "PAID";
  const amount = paid ? Number(input.amount) : null;
  const frequency = paid ? input.frequency ?? null : null;
  if (paid && (!Number.isFinite(amount) || (amount as number) <= 0 || (amount as number) > 10_000_000)) {
    return { success: false, error: "INVALID_AMOUNT" };
  }
  if (paid && !FREQUENCIES.includes(frequency as TipsterCostFrequency)) {
    return { success: false, error: "INVALID_FREQUENCY" };
  }

  const result = await prisma.$transaction(async (tx) => {
    const latest = await tx.tipsterCostPeriod.findFirst({
      where: { tipsterId: owned.id },
      orderBy: [{ startDate: "desc" }, { createdAt: "desc" }],
    });

    if (latest && startDate < latest.startDate) {
      return { success: false as const, error: "START_BEFORE_CURRENT" as const };
    }

    const data = {
      kind: input.kind,
      amount,
      currency: owned.user.currency,
      frequency,
      startDate,
      endDate,
    };

    if (latest && startDate.getTime() === latest.startDate.getTime()) {
      await tx.tipsterCostPeriod.update({ where: { id: latest.id }, data });
      return { success: true as const };
    }

    if (latest && (!latest.endDate || latest.endDate >= startDate)) {
      await tx.tipsterCostPeriod.update({
        where: { id: latest.id },
        data: { endDate: previousUtcDay(startDate) },
      });
    }

    await tx.tipsterCostPeriod.create({ data: { tipsterId: owned.id, ...data } });
    return { success: true as const };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

  if (result.success) revalidateTipsterCostViews();
  return result;
}

export async function endTipsterCostPeriod(
  tipsterId: string,
  endDateValue: string
): Promise<TipsterCostMutationResult> {
  const user = await requireUser();
  const endDate = parseDateOnly(endDateValue);
  if (!endDate) return { success: false, error: "INVALID_DATE" };

  const latest = await prisma.tipsterCostPeriod.findFirst({
    where: { tipster: { id: tipsterId, userId: user.id } },
    orderBy: [{ startDate: "desc" }, { createdAt: "desc" }],
    select: { id: true, startDate: true },
  });
  if (!latest) {
    const owned = await prisma.tipster.findFirst({ where: { id: tipsterId, userId: user.id }, select: { id: true } });
    return { success: false, error: owned ? "NO_COST_PERIOD" : "TIPSTER_NOT_FOUND" };
  }
  if (endDate < latest.startDate) return { success: false, error: "INVALID_DATE" };

  await prisma.tipsterCostPeriod.update({ where: { id: latest.id }, data: { endDate } });
  revalidateTipsterCostViews();
  return { success: true };
}

