"use server";

import type { Plan } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { QUALITY_BUCKET } from "@/lib/scan/quality";
import { stripe } from "@/lib/stripe";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

const VALID_PLANS: Plan[] = ["FREE", "BETA_TESTER", "BETA_PREMIUM", "PREMIUM"];

function validUserId(userId: string): string {
  const value = userId.trim();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
    throw new Error("Identifiant utilisateur invalide.");
  }
  return value;
}

function revalidateAdminViews() {
  revalidatePath("/[locale]/admin", "page");
  revalidatePath("/[locale]/dashboard", "page");
}

export async function updateAdminUserPlan(userIdInput: string, planInput: Plan) {
  const admin = await requireAdmin();
  const userId = validUserId(userIdInput);
  if (!VALID_PLANS.includes(planInput)) throw new Error("Formule invalide.");

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, plan: true, stripeSubscriptionId: true },
  });
  if (!target) throw new Error("Utilisateur introuvable.");
  if (target.stripeSubscriptionId && target.plan !== planInput) {
    throw new Error("Cette formule est pilotée par Stripe. Résilie d’abord l’abonnement avant de la modifier.");
  }
  if (target.plan === planInput) return { plan: target.plan };

  await prisma.user.update({ where: { id: userId }, data: { plan: planInput } });
  console.info(JSON.stringify({
    level: "info",
    message: "admin_user_plan_changed",
    adminEmail: admin.email,
    targetUserId: userId,
    targetEmail: target.email,
    previousPlan: target.plan,
    nextPlan: planInput,
  }));
  revalidateAdminViews();
  return { plan: planInput };
}

export async function deleteAdminUser(userIdInput: string) {
  const admin = await requireAdmin();
  const userId = validUserId(userIdInput);
  if (admin.id === userId) throw new Error("Tu ne peux pas supprimer ton propre compte administrateur.");

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      email: true,
      stripeCustomerId: true,
      stripeSubscriptionId: true,
      scanQualityReports: { select: { storagePath: true } },
    },
  });
  if (!target) throw new Error("Utilisateur introuvable.");
  if (target.stripeSubscriptionId) {
    throw new Error("Résilie d’abord l’abonnement Stripe avant de supprimer ce compte.");
  }

  if (target.stripeCustomerId) {
    if (!stripe) throw new Error("Stripe n’est pas configuré : le profil de facturation ne peut pas être supprimé.");
    await stripe.customers.del(target.stripeCustomerId);
  }

  const supabase = createAdminSupabaseClient();
  const storagePaths = target.scanQualityReports.map((report) => report.storagePath);
  if (storagePaths.length > 0) {
    const { error: storageError } = await supabase.storage.from(QUALITY_BUCKET).remove(storagePaths);
    if (storageError) throw new Error(`Impossible de supprimer les captures du compte : ${storageError.message}`);
  }

  const { error: authError } = await supabase.auth.admin.deleteUser(userId, false);
  if (authError) throw new Error(`Impossible de supprimer le compte Auth : ${authError.message}`);

  // La suppression Auth ne cascade pas vers public.users dans le schéma
  // historique de l'application. Prisma retire donc le profil et toutes ses
  // relations métier configurées en onDelete: Cascade.
  await prisma.user.deleteMany({ where: { id: userId } });
  console.info(JSON.stringify({
    level: "info",
    message: "admin_user_deleted",
    adminEmail: admin.email,
    targetUserId: userId,
    targetEmail: target.email,
  }));
  revalidateAdminViews();
  return { deleted: true };
}
