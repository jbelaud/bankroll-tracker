"use server";

import { randomBytes } from "crypto";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getServerLocale } from "@/lib/i18n/get-server-locale";
import {
  BETA_INVITE_DURATION_DAYS,
  hashBetaInviteToken,
  isBetaPhaseActive,
  normalizeBetaInviteEmail,
} from "@/lib/beta/program";

function revalidateBetaViews() {
  revalidatePath("/[locale]/admin", "page");
  revalidatePath("/[locale]/dashboard", "page");
  revalidatePath("/[locale]/account", "page");
}

async function inviteBaseUrl(): Promise<string> {
  if (process.env.NEXT_PUBLIC_APP_URL) return new URL(process.env.NEXT_PUBLIC_APP_URL).origin;
  if (process.env.NODE_ENV === "production") throw new Error("NEXT_PUBLIC_APP_URL doit être configuré.");
  const requestHeaders = await headers();
  const host = requestHeaders.get("host");
  if (!host) throw new Error("Hôte de l'application introuvable.");
  return `${requestHeaders.get("x-forwarded-proto") ?? "http"}://${host}`;
}

export async function createBetaInvite(emailInput: string): Promise<{ url: string }> {
  await requireAdmin();
  if (!(await isBetaPhaseActive())) throw new Error("La phase bêta est terminée.");

  const email = normalizeBetaInviteEmail(emailInput);
  if (emailInput.trim() && !email) throw new Error("Adresse e-mail invalide.");
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + BETA_INVITE_DURATION_DAYS * 24 * 60 * 60 * 1_000);
  await prisma.betaInvite.create({ data: { tokenHash: hashBetaInviteToken(token), email, expiresAt } });
  revalidateBetaViews();

  return { url: `${await inviteBaseUrl()}/${await getServerLocale()}/signup?invite=${encodeURIComponent(token)}` };
}

export async function revokeBetaInvite(id: string) {
  await requireAdmin();
  await prisma.betaInvite.updateMany({ where: { id, redeemedAt: null, revokedAt: null }, data: { revokedAt: new Date() } });
  revalidateBetaViews();
}

export async function revokeBetaTester(userId: string) {
  await requireAdmin();
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { plan: true } });
  if (!user) throw new Error("Utilisateur introuvable.");
  if (user.plan !== "BETA_TESTER") throw new Error("Cet utilisateur n'est pas bêta-testeur.");
  await prisma.user.update({ where: { id: userId }, data: { plan: "FREE" } });
  revalidateBetaViews();
}

export async function endBetaPhase() {
  const admin = await requireAdmin();
  const now = new Date();
  await prisma.$transaction(async (tx) => {
    await tx.betaProgram.upsert({
      where: { id: "global" },
      update: { phase: "ENDED", endedAt: now, endedBy: admin.email ?? null },
      create: { id: "global", phase: "ENDED", endedAt: now, endedBy: admin.email ?? null },
    });
    await tx.betaInvite.updateMany({ where: { redeemedAt: null, revokedAt: null }, data: { revokedAt: now } });
  });
  revalidateBetaViews();
}

export async function switchBetaTesterToFreemium() {
  const user = await requireUser();
  if (await isBetaPhaseActive()) throw new Error("La phase bêta est toujours active.");
  await prisma.user.updateMany({ where: { id: user.id, plan: "BETA_TESTER" }, data: { plan: "FREE" } });
  revalidateBetaViews();
}
