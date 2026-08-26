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
  BETA_INVITE_TOKEN_BYTES,
  DEFAULT_BETA_CAMPAIGN_MAX_REDEMPTIONS,
  MAX_BETA_CAMPAIGN_MAX_REDEMPTIONS,
  hashBetaInviteToken,
  isBetaPhaseActive,
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

export async function createBetaCampaignInvite(maxRedemptionsInput?: number): Promise<{ url: string; maxRedemptions: number }> {
  await requireAdmin();
  if (!(await isBetaPhaseActive())) throw new Error("La phase bêta est terminée.");

  const maxRedemptions = Number.isInteger(maxRedemptionsInput)
    ? Number(maxRedemptionsInput)
    : DEFAULT_BETA_CAMPAIGN_MAX_REDEMPTIONS;
  if (maxRedemptions < 1 || maxRedemptions > MAX_BETA_CAMPAIGN_MAX_REDEMPTIONS) {
    throw new Error(`Choisis entre 1 et ${MAX_BETA_CAMPAIGN_MAX_REDEMPTIONS} inscriptions.`);
  }

  const token = randomBytes(BETA_INVITE_TOKEN_BYTES).toString("base64url");
  const expiresAt = new Date(Date.now() + BETA_INVITE_DURATION_DAYS * 24 * 60 * 60 * 1_000);
  // Chaque lien porte sa propre limite et peut rester actif en parallèle des
  // précédents. Cela permet de comparer plusieurs sources d'acquisition sans
  // invalider une invitation individuelle encore en circulation.
  await prisma.betaInvite.create({ data: { tokenHash: hashBetaInviteToken(token), expiresAt, maxRedemptions } });
  revalidateBetaViews();

  return { url: `${await inviteBaseUrl()}/${await getServerLocale()}/signup?invite=${encodeURIComponent(token)}`, maxRedemptions };
}

export async function revokeBetaInvite(id: string) {
  await requireAdmin();
  await prisma.betaInvite.updateMany({ where: { id, revokedAt: null }, data: { revokedAt: new Date() } });
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
    await tx.betaInvite.updateMany({ where: { revokedAt: null }, data: { revokedAt: now } });
    // Le passage au Freemium est global et immédiat : les deux bankrolls les
    // plus récentes deviennent alors verrouillées si le compte en possède plus
    // de deux. Les abonnements payants bêta restent, eux, inchangés.
    await tx.user.updateMany({ where: { plan: "BETA_TESTER" }, data: { plan: "FREE" } });
  });
  revalidateBetaViews();
}

export async function switchBetaTesterToFreemium() {
  const user = await requireUser();
  if (await isBetaPhaseActive()) throw new Error("La phase bêta est toujours active.");
  await prisma.user.updateMany({ where: { id: user.id, plan: "BETA_TESTER" }, data: { plan: "FREE" } });
  revalidateBetaViews();
}
