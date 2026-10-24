import "server-only";
import { prisma } from "@/lib/prisma";
import { EMAIL_MARKETING_CONSENT_VERSION, emailMarketingCopy } from "./copy";

export type EmailMarketingPreference = { enabled: boolean; consentedEmail: string | null };

export async function getEmailMarketingPreference(userId: string, email: string) {
  const rows = await prisma.$queryRaw<EmailMarketingPreference[]>`
    SELECT enabled, consented_email AS "consentedEmail"
    FROM email_marketing_preferences WHERE user_id = ${userId}`;
  const row = rows[0];
  if (!row) return null;
  // A consent for a former address never silently subscribes the new address.
  if (row.enabled && row.consentedEmail !== email.toLowerCase()) return null;
  return { enabled: row.enabled };
}

export async function saveEmailMarketingPreference(
  user: { id: string; email: string }, enabled: boolean, locale: "fr" | "en", source: "account" | "post_login",
) {
  const email = user.email.toLowerCase();
  const statement = emailMarketingCopy(locale).label;
  await prisma.$transaction(async (tx) => {
    // Serialize choices for this user so concurrent requests cannot corrupt the audit order.
    await tx.$queryRaw`SELECT id FROM users WHERE id = ${user.id} FOR UPDATE`;
    const previous = await tx.$queryRaw<EmailMarketingPreference[]>`
      SELECT enabled, consented_email AS "consentedEmail"
      FROM email_marketing_preferences WHERE user_id = ${user.id}`;
    if (previous[0]?.enabled === enabled && (!enabled || previous[0].consentedEmail === email)) return;
    await tx.$executeRaw`
      INSERT INTO email_marketing_preferences
        (user_id, enabled, consented_email, consent_version, chosen_at)
      VALUES (${user.id}, ${enabled}, ${enabled ? email : null}, ${EMAIL_MARKETING_CONSENT_VERSION}, now())
      ON CONFLICT (user_id) DO UPDATE SET enabled = EXCLUDED.enabled,
        consented_email = EXCLUDED.consented_email, consent_version = EXCLUDED.consent_version, chosen_at = now()`;
    await tx.$executeRaw`
      INSERT INTO email_marketing_choices (user_id, enabled, email, consent_version, statement, locale, source)
      VALUES (${user.id}, ${enabled}, ${email}, ${EMAIL_MARKETING_CONSENT_VERSION}, ${statement}, ${locale}, ${source})`;
  });
}
