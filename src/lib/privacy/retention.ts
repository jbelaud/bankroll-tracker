import "server-only";
import { prisma } from "@/lib/prisma";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export function calendarMonthsAgo(now: Date, months: number) {
  const result = new Date(now); const day = result.getUTCDate(); result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() - months);
  const lastDay = new Date(Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)).getUTCDate();
  result.setUTCDate(Math.min(day, lastDay)); return result;
}
const unpaidPlans = ["FREE", "BETA_TESTER"] as const;
export function inactivityCutoff(now: Date) { return calendarMonthsAgo(now, 24); }
export async function purgeTemporaryData(now = new Date()) {
  const drafts = await prisma.scanDraft.deleteMany({ where: { updatedAt: { lt: new Date(now.getTime() - 30 * 86_400_000) } } });
  const analytics = await prisma.growthEvent.deleteMany({ where: { createdAt: { lt: calendarMonthsAgo(now, 6) } } });
  // Open complaints and reports remain available until resolved or explicitly archived.
  const support = await prisma.feedback.deleteMany({ where: { status: "CLOSED", legalHold: false, closedAt: { lt: calendarMonthsAgo(now, 12) } } });
  return { drafts: drafts.count, analytics: analytics.count, closedSupport: support.count };
}
export async function queueInactivityWarnings(now = new Date()) {
  const candidates = await prisma.user.findMany({ where: { lastActiveAt: { lt: inactivityCutoff(now) }, inactivityNoticeAt: null, plan: { in: [...unpaidPlans] }, OR: [{ stripeSubscriptionId: null }, { subscriptionStatus: { in: ["canceled", "incomplete_expired"] } }] }, take: 100, orderBy: { lastActiveAt: "asc" }, select: { id: true, email: true, lastActiveAt: true } });
  for (const user of candidates) {
    const dedupeKey = `inactive:${user.id}:${user.lastActiveAt.getTime()}`;
    await prisma.transactionalEmail.upsert({ where: { dedupeKey }, update: {}, create: { userId: user.id, dedupeKey, kind: "INACTIVITY_WARNING", recipient: user.email, subject: "Ton compte Kalivoa est inactif : conserve ton historique", text: "Ton compte Kalivoa n’a enregistré aucune activité depuis au moins deux ans. Connecte-toi dans les 30 jours suivant cet avertissement pour conserver ton compte, ton historique et tes crédits restants. À défaut, leur suppression est prévue ; les pièces comptables et preuves requises légalement restent archivées séparément. Tu peux exporter ton historique depuis Compte > Mes données.\n\nConnexion : " + (process.env.NEXT_PUBLIC_APP_URL ?? "https://kalivoa.com") + "/fr/login\nContact : contact.kalivoa@gmail.com" } });
  }
  return candidates.length;
}
export async function purgeInactiveAccounts(now = new Date()) {
  if (process.env.ACCOUNT_RETENTION_DELETION_ENABLED !== "true") return { enabled: false, deleted: 0 };
  const candidates = await prisma.user.findMany({ where: { lastActiveAt: { lt: inactivityCutoff(now) }, inactivityNoticeAt: { lt: new Date(now.getTime() - 30 * 86_400_000) }, plan: { in: [...unpaidPlans] }, OR: [{ stripeSubscriptionId: null }, { subscriptionStatus: { in: ["canceled", "incomplete_expired"] } }] }, take: 10, select: { id: true, lastActiveAt: true, inactivityNoticeAt: true } });
  const admin = createAdminSupabaseClient(); let deleted = 0;
  for (const candidate of candidates) {
    await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM users WHERE id = ${candidate.id} FOR UPDATE`;
      const current = await tx.user.findUnique({ where: { id: candidate.id } });
      if (!current || current.lastActiveAt.getTime() !== candidate.lastActiveAt.getTime() || !current.inactivityNoticeAt
        || current.inactivityNoticeAt.getTime() >= now.getTime() - 30 * 86_400_000 || !unpaidPlans.some((plan) => plan === current.plan)
        || current.stripeSubscriptionId && !["canceled", "incomplete_expired"].includes(current.subscriptionStatus ?? "")) return;
      const warning = await tx.transactionalEmail.findUnique({ where: { dedupeKey: `inactive:${current.id}:${current.lastActiveAt.getTime()}` } });
      if (warning?.status !== "DELIVERED" || !warning.deliveredAt) return;
      // Unresolved legal requests must be processed before personal-profile deletion.
      const pendingWithdrawal = await tx.withdrawalRequest.count({ where: { userId: current.id, status: { in: ["PENDING", "RETRY", "REFUND_PENDING", "NEEDS_REVIEW"] } } });
      const heldSupport = await tx.feedback.count({ where: { userId: current.id, OR: [{ legalHold: true }, { status: { not: "CLOSED" } }] } });
      if (pendingWithdrawal || heldSupport) return;
      const images = await tx.scanQualityReport.findMany({ where: { userId: current.id }, select: { storagePath: true } });
      if (images.length) {
        const result = await admin.storage.from("scan-quality-reports").remove(images.map((image) => image.storagePath));
        if (result.error) throw new Error("PROFILE_STORAGE_DELETE_FAILED");
      }
      const auth = await admin.auth.admin.deleteUser(current.id);
      if (auth.error && auth.error.status !== 404) throw new Error("AUTH_DELETE_FAILED");
      await tx.user.delete({ where: { id: current.id } });
      deleted++;
    }, { maxWait: 10_000, timeout: 45_000 });
  }
  return { enabled: true, deleted };
}
