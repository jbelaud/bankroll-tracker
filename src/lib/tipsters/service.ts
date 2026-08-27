import "server-only";

import { prisma } from "@/lib/prisma";
import { normalizeTipsterName } from "@/lib/tipsters/normalize";

export type TipsterSelection = {
  /** undefined = résolution conservatrice depuis le nom détecté ; null = Personnel explicite. */
  tipsterId?: string | null;
  detectedTipsterName?: string | null;
};

export async function resolveOwnedTipsterId(
  userId: string,
  selection: TipsterSelection,
  options: { allowArchivedById?: boolean } = {}
): Promise<string | null> {
  if (selection.tipsterId === null) return null;

  if (typeof selection.tipsterId === "string") {
    const tipster = await prisma.tipster.findFirst({
      where: {
        id: selection.tipsterId,
        userId,
        ...(options.allowArchivedById ? {} : { status: "ACTIVE" }),
      },
      select: { id: true },
    });
    if (!tipster) throw new Error("Tipster introuvable.");
    return tipster.id;
  }

  const normalizedName = selection.detectedTipsterName
    ? normalizeTipsterName(selection.detectedTipsterName)
    : "";
  if (!normalizedName) return null;

  const matched = await prisma.tipster.findUnique({
    where: { userId_normalizedName: { userId, normalizedName } },
    select: { id: true, status: true },
  });
  return matched?.status === "ACTIVE" ? matched.id : null;
}

export async function resolveOwnedTipsterIdsForImport(
  userId: string,
  selections: TipsterSelection[]
): Promise<Array<string | null>> {
  const requestedIds = Array.from(new Set(selections.flatMap((selection) =>
    typeof selection.tipsterId === "string" ? [selection.tipsterId] : []
  )));
  const requestedNames = Array.from(new Set(selections.flatMap((selection) => {
    if (selection.tipsterId !== undefined || !selection.detectedTipsterName) return [];
    const normalizedName = normalizeTipsterName(selection.detectedTipsterName);
    return normalizedName ? [normalizedName] : [];
  })));

  if (requestedIds.length === 0 && requestedNames.length === 0) {
    return selections.map(() => null);
  }

  const tipsters = await prisma.tipster.findMany({
    where: {
      userId,
      status: "ACTIVE",
      OR: [
        ...(requestedIds.length > 0 ? [{ id: { in: requestedIds } }] : []),
        ...(requestedNames.length > 0 ? [{ normalizedName: { in: requestedNames } }] : []),
      ],
    },
    select: { id: true, normalizedName: true },
  });
  const byId = new Map(tipsters.map((tipster) => [tipster.id, tipster.id]));
  const byName = new Map(tipsters.map((tipster) => [tipster.normalizedName, tipster.id]));

  for (const requestedId of requestedIds) {
    if (!byId.has(requestedId)) throw new Error("Tipster introuvable.");
  }

  return selections.map((selection) => {
    if (selection.tipsterId === null) return null;
    if (typeof selection.tipsterId === "string") return byId.get(selection.tipsterId) ?? null;
    const normalizedName = selection.detectedTipsterName
      ? normalizeTipsterName(selection.detectedTipsterName)
      : "";
    return normalizedName ? byName.get(normalizedName) ?? null : null;
  });
}
