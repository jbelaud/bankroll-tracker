import type { Plan } from "@prisma/client";

// Les deux plans gratuits n'ont pas la même promesse : pendant la bêta on
// laisse les testeurs gérer davantage de bookmakers, puis le Freemium revient
// à deux bankrolls actives.
export const ACTIVE_BANKROLL_LIMITS: Record<Plan, number | null> = {
  FREE: 2,
  BETA_TESTER: 4,
  BETA_PREMIUM: null,
  PREMIUM: null,
};

export function activeBankrollLimit(plan: Plan): number | null {
  return ACTIVE_BANKROLL_LIMITS[plan];
}

export function isBankrollLocked(
  plan: Plan,
  bankrollIndexByAge: number
): boolean {
  const limit = activeBankrollLimit(plan);
  return limit !== null && bankrollIndexByAge >= limit;
}
