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
