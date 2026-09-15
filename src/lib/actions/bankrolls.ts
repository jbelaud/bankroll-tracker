"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { getServerLocale } from "@/lib/i18n/get-server-locale";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { normalizeBookmaker } from "@/lib/bookmakers";
import { activeBankrollLimit, isBankrollLocked } from "@/lib/billing/bankroll-limits";
import { isBankrollLockedForUser } from "@/lib/billing/bankroll-access";
import { recordGrowthEventSafely } from "@/lib/growth/events";

export type BankrollAllocationInput = { bookmaker: string; initial: number };
export type BankrollInput = {
  name: string;
  mode: "SINGLE" | "DISTRIBUTED";
  initial: number;
  referenceCapital: number | null;
  allocations: BankrollAllocationInput[];
};

function normalizeInput(input: BankrollInput) {
  if (!Number.isFinite(input.initial) || input.initial < 0) throw new Error("INVALID_INITIAL");
  if (input.referenceCapital !== null && (!Number.isFinite(input.referenceCapital) || input.referenceCapital <= 0)) {
    throw new Error("INVALID_REFERENCE");
  }

  const allocations = input.mode === "DISTRIBUTED"
    ? input.allocations.map((allocation) => ({
        bookmaker: normalizeBookmaker(allocation.bookmaker),
        initial: Number(allocation.initial),
      }))
    : [];
  if (input.mode === "DISTRIBUTED" && (
    allocations.length === 0 ||
    allocations.some((allocation) => !allocation.bookmaker || !Number.isFinite(allocation.initial) || allocation.initial < 0)
  )) throw new Error("INVALID_ALLOCATIONS");
  if (new Set(allocations.map((allocation) => allocation.bookmaker.toLocaleLowerCase("fr"))).size !== allocations.length) {
    throw new Error("DUPLICATE_ALLOCATIONS");
  }
  const allocated = allocations.reduce((sum, allocation) => sum + allocation.initial, 0);
  if (input.mode === "DISTRIBUTED" && Math.abs(allocated - input.initial) > 0.005) {
    throw new Error("ALLOCATION_TOTAL");
  }
  return { ...input, name: input.name.trim(), allocations };
}

async function translatedInput(input: BankrollInput) {
  const locale = await getServerLocale();
  const t = await getTranslations({ locale, namespace: "errors" });
  try {
    return normalizeInput(input);
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (code === "INVALID_INITIAL") throw new Error(t("initialCapitalPositive"));
    if (code === "INVALID_REFERENCE") throw new Error(t("referenceCapitalPositive"));
    if (code === "DUPLICATE_ALLOCATIONS") throw new Error(t("duplicateBookmakerAllocation"));
    if (code === "ALLOCATION_TOTAL") throw new Error(t("allocationTotalMismatch"));
    throw new Error(t("bookmakerRequired"));
  }
}

export async function createBankroll(input: BankrollInput) {
  const user = await requireUser();
  const locale = await getServerLocale();
  const t = await getTranslations({ locale, namespace: "errors" });

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { plan: true },
  });
  const limit = dbUser ? activeBankrollLimit(dbUser.plan) : null;
  if (limit !== null) {
    const count = await prisma.bankroll.count({ where: { userId: user.id } });
    if (count >= limit) {
      throw new Error(t("bankrollLimitReached", { limit }));
    }
  }

  const normalized = await translatedInput(input);
  const legacyBookmaker = normalized.allocations.length === 1 ? normalized.allocations[0].bookmaker : null;

  const bankroll = await prisma.bankroll.create({
    data: {
      userId: user.id,
      name: normalized.name || legacyBookmaker || "Bankroll principale",
      mode: normalized.mode,
      bookmaker: legacyBookmaker,
      initial: normalized.initial,
      referenceCapital: normalized.referenceCapital,
      referencePeriods: { create: { referenceCapital: normalized.referenceCapital, effectiveFrom: new Date() } },
      allocations: normalized.allocations.length ? { create: normalized.allocations } : undefined,
    },
    include: { allocations: { orderBy: { createdAt: "asc" } } },
  });
  await recordGrowthEventSafely({
    name: "bankroll_created",
    userId: user.id,
    properties: { mode: normalized.mode, bookmakers_count: normalized.allocations.length },
  });
  return bankroll;
}

export async function updateBankroll(
  id: string,
  input: BankrollInput
) {
  const user = await requireUser();
  const locale = await getServerLocale();
  const t = await getTranslations({ locale, namespace: "errors" });

  // Vérification de propriété avant toute écriture — même verrou anti-IDOR
  // que getOwnedBankroll côté bets : un id deviné échoue toujours.
  const owned = await prisma.bankroll.findFirst({
    where: { id, userId: user.id },
  });
  if (!owned) {
    throw new Error(t("bankrollNotFound"));
  }
  if (await isBankrollLockedForUser(user.id, id)) {
    throw new Error(t("bankrollLocked"));
  }

  const normalized = await translatedInput(input);
  const legacyBookmaker = normalized.allocations.length === 1 ? normalized.allocations[0].bookmaker : null;

  return prisma.$transaction(async (tx) => {
    // Serialize changes of reference for this bankroll.
    await tx.$queryRaw`SELECT id FROM bankrolls WHERE id = ${id} FOR UPDATE`;
    const current = await tx.bankroll.findUniqueOrThrow({ where: { id } });
    if (current.referenceCapital !== normalized.referenceCapital) {
      await tx.bankrollReferencePeriod.create({
        data: { bankrollId: id, referenceCapital: normalized.referenceCapital, effectiveFrom: new Date() },
      });
    }
    if (normalized.mode === "DISTRIBUTED") {
      const existing = await tx.bankrollAllocation.findMany({
        where: { bankrollId: id },
        include: { _count: { select: { bets: true, movements: true } } },
      });
      const wanted = new Set(normalized.allocations.map((allocation) => allocation.bookmaker.toLocaleLowerCase("fr")));
      const removable = existing.filter((allocation) => !wanted.has(allocation.bookmaker.toLocaleLowerCase("fr")));
      if (removable.some((allocation) => allocation._count.bets > 0 || allocation._count.movements > 0)) {
        throw new Error(t("allocationInUse"));
      }
      if (removable.length) await tx.bankrollAllocation.deleteMany({ where: { id: { in: removable.map(({ id: allocationId }) => allocationId) } } });
      for (const allocation of normalized.allocations) {
        await tx.bankrollAllocation.upsert({
          where: { bankrollId_bookmaker: { bankrollId: id, bookmaker: allocation.bookmaker } },
          create: { bankrollId: id, ...allocation },
          update: { initial: allocation.initial },
        });
      }
    }

    return tx.bankroll.update({
      where: { id },
      data: {
        name: normalized.name || legacyBookmaker || "Bankroll principale",
        mode: normalized.mode,
        bookmaker: normalized.mode === "DISTRIBUTED" ? legacyBookmaker : null,
        initial: normalized.initial,
        referenceCapital: normalized.referenceCapital,
      },
      include: { allocations: { orderBy: { createdAt: "asc" } } },
    });
  });
}

export async function listBankrolls() {
  const user = await requireUser();

  // Cette action alimente les écrans les plus fréquents. Avec le pooler
  // transactionnel Supabase, des lectures parallèles peuvent inutilement
  // saturer la connexion Prisma limitée par instance.
  const dbUser = await prisma.user.findUniqueOrThrow({
    where: { id: user.id },
    select: { plan: true },
  });
  const bankrollsByAge = await prisma.bankroll.findMany({
    where: { userId: user.id },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    include: { allocations: { orderBy: [{ createdAt: "asc" }, { id: "asc" }] } },
  });

  return bankrollsByAge
    .map((bankroll, index) => ({
      ...bankroll,
      locked: isBankrollLocked(dbUser.plan, index),
    }))
    .reverse();
}

export async function deleteBankroll(id: string) {
  const user = await requireUser();
  const locale = await getServerLocale();

  const owned = await prisma.bankroll.findFirst({
    where: { id, userId: user.id },
  });
  if (!owned) {
    const t = await getTranslations({ locale, namespace: "errors" });
    throw new Error(t("bankrollNotFound"));
  }

  // onDelete: Cascade (schema.prisma) supprime aussi tous les paris liés.
  await prisma.bankroll.delete({ where: { id } });

  revalidatePath("/[locale]/bankrolls", "page");
  revalidatePath("/[locale]/dashboard", "page");
  redirect({ href: "/bankrolls", locale });
}
