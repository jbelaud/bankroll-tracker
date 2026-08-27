"use server";

import { Prisma, type TipsterPlatform } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { recordGrowthEventSafely } from "@/lib/growth/events";
import { prisma } from "@/lib/prisma";
import {
  cleanTipsterName,
  cleanTipsterNotes,
  normalizeTipsterName,
} from "@/lib/tipsters/normalize";

const TIPSTER_PLATFORMS = ["DISCORD", "TELEGRAM", "X", "WEBSITE", "OTHER"] as const;

export type TipsterDto = {
  id: string;
  name: string;
  normalizedName: string;
  platform: TipsterPlatform | null;
  notes: string | null;
  status: "ACTIVE" | "ARCHIVED";
  archivedAt: Date | null;
  betCount: number;
};

export type TipsterInput = {
  name: string;
  platform?: TipsterPlatform | null;
  notes?: string | null;
};

export type CreateTipsterResult =
  | { success: true; tipster: TipsterDto; existing: boolean }
  | { success: false; error: string };

function isTipsterPlatform(value: unknown): value is TipsterPlatform {
  return value === null || TIPSTER_PLATFORMS.includes(value as TipsterPlatform);
}

function tipsterDto(tipster: {
  id: string;
  name: string;
  normalizedName: string;
  platform: TipsterPlatform | null;
  notes: string | null;
  status: "ACTIVE" | "ARCHIVED";
  archivedAt: Date | null;
  _count: { bets: number };
}): TipsterDto {
  return {
    id: tipster.id,
    name: tipster.name,
    normalizedName: tipster.normalizedName,
    platform: tipster.platform,
    notes: tipster.notes,
    status: tipster.status,
    archivedAt: tipster.archivedAt,
    betCount: tipster._count.bets,
  };
}

function revalidateTipsterViews() {
  revalidatePath("/[locale]/tipsters", "page");
  revalidatePath("/[locale]/scan", "page");
  revalidatePath("/[locale]/scan/manual", "page");
  revalidatePath("/[locale]/import-history", "page");
  revalidatePath("/[locale]/history", "page");
}

export async function listTipsters(options: { includeArchived?: boolean } = {}): Promise<TipsterDto[]> {
  const user = await requireUser();
  const tipsters = await prisma.tipster.findMany({
    where: {
      userId: user.id,
      ...(options.includeArchived ? {} : { status: "ACTIVE" }),
    },
    orderBy: [{ status: "asc" }, { name: "asc" }],
    include: { _count: { select: { bets: true } } },
  });
  return tipsters.map(tipsterDto);
}

export async function createTipster(
  input: TipsterInput,
  origin: "management" | "import" = "management"
): Promise<CreateTipsterResult> {
  const user = await requireUser();
  const name = cleanTipsterName(input.name);
  const normalizedName = normalizeTipsterName(name);
  const platform = input.platform ?? null;

  if (!name) return { success: false, error: "Le nom du tipster est requis." };
  if (!isTipsterPlatform(platform)) return { success: false, error: "Plateforme invalide." };

  const existing = await prisma.tipster.findUnique({
    where: { userId_normalizedName: { userId: user.id, normalizedName } },
    include: { _count: { select: { bets: true } } },
  });
  if (existing) {
    return { success: true, tipster: tipsterDto(existing), existing: true };
  }

  try {
    const created = await prisma.tipster.create({
      data: {
        userId: user.id,
        name,
        normalizedName,
        platform,
        notes: cleanTipsterNotes(input.notes),
      },
      include: { _count: { select: { bets: true } } },
    });
    await recordGrowthEventSafely({
      name: origin === "import" ? "tipster_created_from_import" : "tipster_created",
      userId: user.id,
      properties: { platform: platform?.toLocaleLowerCase() ?? null },
    });
    revalidateTipsterViews();
    return { success: true, tipster: tipsterDto(created), existing: false };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const concurrent = await prisma.tipster.findUnique({
        where: { userId_normalizedName: { userId: user.id, normalizedName } },
        include: { _count: { select: { bets: true } } },
      });
      if (concurrent) return { success: true, tipster: tipsterDto(concurrent), existing: true };
    }
    throw error;
  }
}

export async function updateTipster(id: string, input: TipsterInput): Promise<CreateTipsterResult> {
  const user = await requireUser();
  const owned = await prisma.tipster.findFirst({ where: { id, userId: user.id }, select: { id: true } });
  if (!owned) return { success: false, error: "Tipster introuvable." };

  const name = cleanTipsterName(input.name);
  const normalizedName = normalizeTipsterName(name);
  const platform = input.platform ?? null;
  if (!name) return { success: false, error: "Le nom du tipster est requis." };
  if (!isTipsterPlatform(platform)) return { success: false, error: "Plateforme invalide." };

  const duplicate = await prisma.tipster.findFirst({
    where: { userId: user.id, normalizedName, id: { not: id } },
    include: { _count: { select: { bets: true } } },
  });
  if (duplicate) return { success: false, error: "Un tipster portant ce nom existe déjà." };

  const updated = await prisma.tipster.update({
    where: { id: owned.id },
    data: { name, normalizedName, platform, notes: cleanTipsterNotes(input.notes) },
    include: { _count: { select: { bets: true } } },
  });
  await recordGrowthEventSafely({ name: "tipster_updated", userId: user.id });
  revalidateTipsterViews();
  return { success: true, tipster: tipsterDto(updated), existing: false };
}

export async function archiveTipster(id: string): Promise<{ success: true } | { success: false; error: string }> {
  const user = await requireUser();
  const updated = await prisma.tipster.updateMany({
    where: { id, userId: user.id, status: "ACTIVE" },
    data: { status: "ARCHIVED", archivedAt: new Date() },
  });
  if (updated.count !== 1) return { success: false, error: "Tipster introuvable." };

  await recordGrowthEventSafely({ name: "tipster_archived", userId: user.id });
  revalidateTipsterViews();
  return { success: true };
}
