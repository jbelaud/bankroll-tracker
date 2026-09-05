"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { personalStake } from "@/lib/bankroll-units";
import { isBankrollLockedForUser } from "@/lib/billing/bankroll-access";

export type StakingState = { error?: string; success?: string };

export async function saveStakingProfile(_state: StakingState, form: FormData): Promise<StakingState> {
  const user = await requireUser();
  const bankrollId = String(form.get("bankrollId") ?? "");
  const data = {
    referenceCapital: Number(form.get("referenceCapital")),
    unitPercent: Number(form.get("unitPercent")),
    rounding: Number(form.get("rounding")),
    decreaseThreshold: Number(form.get("decreaseThreshold")),
    increaseThreshold: Number(form.get("increaseThreshold")),
  };
  try {
    personalStake(1, data.referenceCapital, data.unitPercent, data.rounding);
    if (!Number.isFinite(data.decreaseThreshold) || data.decreaseThreshold <= 0 || data.decreaseThreshold > 100
      || !Number.isFinite(data.increaseThreshold) || data.increaseThreshold <= 0) throw new Error();
  } catch { return { error: "Vérifie les montants et pourcentages renseignés." }; }
  const owned = await prisma.bankroll.findFirst({ where: { id: bankrollId, userId: user.id }, select: { id: true } });
  if (!owned || await isBankrollLockedForUser(user.id, bankrollId)) return { error: "Bankroll inaccessible." };
  await prisma.stakingProfile.upsert({ where: { bankrollId }, create: { bankrollId, ...data }, update: data });
  revalidatePath("/[locale]/bankrolls/[id]", "page");
  return { success: "Réglages personnels enregistrés." };
}
