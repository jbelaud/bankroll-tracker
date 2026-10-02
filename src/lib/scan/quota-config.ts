import type { Plan } from "@prisma/client";

export const SCAN_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;
export const INITIAL_SCAN_CREDIT = 300;
export const INITIAL_SCAN_CREDIT_DURATION_DAYS = 30;
export const SCAN_EXPIRY_ALERT_DAYS = 7;
export const SCAN_RESERVATION_LEASE_MS = 15 * 60 * 1000;
export const SCAN_QUOTA_CONFIG: Record<Plan, { limit: number }> = {
  FREE: { limit: 10 }, BETA_TESTER: { limit: 50 },
  BETA_PREMIUM: { limit: 100 }, PREMIUM: { limit: 200 },
};
export const MONTHLY_LIMITS: Record<Plan, number> = {
  FREE: SCAN_QUOTA_CONFIG.FREE.limit, BETA_TESTER: SCAN_QUOTA_CONFIG.BETA_TESTER.limit,
  BETA_PREMIUM: SCAN_QUOTA_CONFIG.BETA_PREMIUM.limit, PREMIUM: SCAN_QUOTA_CONFIG.PREMIUM.limit,
};
