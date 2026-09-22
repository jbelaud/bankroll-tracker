"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { personalStake } from "@/lib/bankroll-units";
import { prisma } from "@/lib/prisma";

export type PersonalConversionState = { error?: string; success?: string };

export async function savePersonalConversion(
  _state: PersonalConversionState,
  form: FormData,
): Promise<PersonalConversionState> {
  const user = await requireUser();
  const data = {
    referenceCapital: Number(form.get("referenceCapital")),
    unitPercent: Number(form.get("unitPercent")),
    rounding: Number(form.get("rounding")),
  };

  try {
    personalStake(1, data.referenceCapital, data.unitPercent, data.rounding);
  } catch {
    return { error: "Vérifie le montant de référence, le pourcentage et l’arrondi." };
  }

  await prisma.personalConversionProfile.upsert({
    where: { userId: user.id },
    create: { userId: user.id, ...data },
    update: data,
  });
  revalidatePath("/[locale]/account", "layout");
  return { success: "Conversion personnelle enregistrée pour tout ton compte." };
}
