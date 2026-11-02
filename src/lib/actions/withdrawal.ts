"use server";

import { after } from "next/server";
import { requireUser } from "@/lib/auth";
import { getServerLocale } from "@/lib/i18n/get-server-locale";
import { commercialRecordsEnabled } from "@/lib/billing/commercial-config";
import { recordWithdrawal, processWithdrawal } from "@/lib/billing/withdrawals";
import { retryTransactionalEmails } from "@/lib/billing/transactional-emails";
import { stripe } from "@/lib/stripe";

export async function submitWithdrawal(input: { subscriptionId: string; name: string; email: string; confirmed: boolean }): Promise<{ error: string } | { acknowledgement: string; reference: string; eligible: boolean }> {
  const user = await requireUser(); const locale = await getServerLocale(); const en = locale === "en";
  if (!commercialRecordsEnabled()) return { error: en ? "Online requests are not open yet. Contact contact.kalivoa@gmail.com." : "Les demandes en ligne ne sont pas encore ouvertes. Contacte contact.kalivoa@gmail.com." };
  if (!input || typeof input.subscriptionId !== "string" || typeof input.name !== "string" || typeof input.email !== "string" || input.confirmed !== true) return { error: en ? "Check the declaration before confirming." : "Vérifie la déclaration avant de confirmer." };
  try {
    const result = await recordWithdrawal({ id: user.id, email: user.email! }, input);
    after(async () => { if (stripe) await processWithdrawal(stripe, result.request.id); await retryTransactionalEmails(); });
    return { acknowledgement: result.acknowledgement, reference: result.request.id, eligible: result.request.eligible };
  } catch {
    return { error: en ? "The request could not be recorded. Check the contract and account email, or contact support." : "La demande n’a pas pu être enregistrée. Vérifie le contrat et l’email du compte, ou contacte le support." };
  }
}
