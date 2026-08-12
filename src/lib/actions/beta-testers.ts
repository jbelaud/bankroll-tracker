"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function revalidateAdminAndUserViews() {
  revalidatePath("/[locale]/admin", "page");
  revalidatePath("/[locale]/dashboard", "page");
  revalidatePath("/[locale]/account", "page");
}

export async function grantBetaTester(email: string) {
  await requireAdmin();
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail || normalizedEmail.length > 320) throw new Error("Adresse e-mail invalide.");

  const user = await prisma.user.findUnique({ where: { email: normalizedEmail }, select: { id: true, plan: true } });
  if (!user) throw new Error("Utilisateur introuvable.");
  if (user.plan !== "FREE" && user.plan !== "BETA_TESTER") {
    throw new Error("Un abonnement actif ne peut pas être remplacé par le statut bêta-testeur.");
  }

  await prisma.user.update({ where: { id: user.id }, data: { plan: "BETA_TESTER" } });
  revalidateAdminAndUserViews();
}

export async function revokeBetaTester(userId: string) {
  await requireAdmin();
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { plan: true } });
  if (!user) throw new Error("Utilisateur introuvable.");
  if (user.plan !== "BETA_TESTER") throw new Error("Cet utilisateur n'est pas bêta-testeur.");

  await prisma.user.update({ where: { id: userId }, data: { plan: "FREE" } });
  revalidateAdminAndUserViews();
}
