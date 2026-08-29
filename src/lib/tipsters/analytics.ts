import "server-only";

import { prisma } from "@/lib/prisma";
import { computeTipsterPerformance, type TipsterPerformance } from "@/lib/tipsters/performance";

function startOfUtcDay(value: Date): Date {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
}

function endOfUtcDay(value: Date): Date {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate(), 23, 59, 59, 999));
}

export async function getTipsterPerformances(input: {
  userId: string;
  tipsterId?: string;
  betIds?: string[];
  from?: Date;
  to?: Date;
}): Promise<TipsterPerformance[]> {
  const to = endOfUtcDay(input.to ?? new Date());
  const tipsters = await prisma.tipster.findMany({
    where: { userId: input.userId, ...(input.tipsterId ? { id: input.tipsterId } : {}) },
    orderBy: [{ status: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      status: true,
      user: { select: { currency: true } },
      bets: {
        where: {
          bankroll: { userId: input.userId },
          ...(input.betIds ? { id: { in: input.betIds } } : {}),
          date: { ...(input.from ? { gte: startOfUtcDay(input.from) } : {}), lte: to },
        },
        orderBy: { date: "asc" },
      },
      costPeriods: { orderBy: [{ startDate: "asc" }, { createdAt: "asc" }] },
    },
  });

  return tipsters.map((tipster) => {
    const earliest = [
      tipster.bets.at(0)?.date,
      tipster.costPeriods.at(0)?.startDate,
    ].filter((value): value is Date => Boolean(value));
    const from = startOfUtcDay(input.from ?? (earliest.length > 0
      ? new Date(Math.min(...earliest.map((value) => value.getTime())))
      : to));
    return computeTipsterPerformance({
      tipster,
      currency: tipster.user.currency,
      period: { from, to },
      bets: tipster.bets,
      costPeriods: tipster.costPeriods,
    });
  });
}

export async function getTipsterPerformance(input: {
  userId: string;
  tipsterId: string;
  betIds?: string[];
  from?: Date;
  to?: Date;
}): Promise<TipsterPerformance | null> {
  return (await getTipsterPerformances(input))[0] ?? null;
}
