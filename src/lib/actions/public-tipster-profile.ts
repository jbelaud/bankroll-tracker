"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { normalizePublicHandle, normalizeXHandle, validPublicAvatarUrl, validPublicHandle, validXHandle } from "@/lib/public-tipster-profile";

export type PublicTipsterProfileState = { error?: string; success?: string };

export async function savePublicTipsterProfile(_state: PublicTipsterProfileState, form: FormData): Promise<PublicTipsterProfileState> {
  const user = await requireUser();
  const publicDisplayName = String(form.get("publicDisplayName") ?? "").normalize("NFKC").trim().replace(/\s+/g, " ").slice(0, 60);
  const publicHandle = normalizePublicHandle(String(form.get("publicHandle") ?? ""));
  const publicBio = String(form.get("publicBio") ?? "").normalize("NFKC").trim().replace(/\s+/g, " ").slice(0, 240) || null;
  const publicAvatarUrl = String(form.get("publicAvatarUrl") ?? "").trim() || null;
  const publicXHandle = normalizeXHandle(String(form.get("publicXHandle") ?? ""));

  if (publicDisplayName.length < 2) return { error: "Choisis un nom public d’au moins 2 caractères." };
  if (!validPublicHandle(publicHandle)) return { error: "Ton identifiant doit contenir 3 à 30 lettres minuscules, chiffres, tirets ou underscores." };
  if (!validXHandle(publicXHandle)) return { error: "Le nom d’utilisateur X n’est pas valide." };
  if (!validPublicAvatarUrl(publicAvatarUrl)) return { error: "L’adresse du logo doit être une URL HTTPS valide." };

  try {
    await prisma.user.update({
      where: { id: user.id },
      data: { publicDisplayName, publicHandle, publicBio, publicAvatarUrl, publicXHandle },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { error: "Cet identifiant public est déjà utilisé." };
    }
    return { error: "Impossible d’enregistrer ton profil public pour le moment." };
  }

  revalidatePath("/[locale]/account", "page");
  revalidatePath("/[locale]/p/[slug]", "page");
  return { success: "Profil public enregistré." };
}
