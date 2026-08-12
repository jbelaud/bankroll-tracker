import type { Plan } from "@prisma/client";

export function isPaidPlan(plan: Plan): boolean {
  return plan === "BETA_PREMIUM" || plan === "PREMIUM";
}

export function hasInitialScanCredits(plan: Plan): boolean {
  return isPaidPlan(plan);
}
