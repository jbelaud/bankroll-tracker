import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { commercialRecordsEnabled, dateForCustomer } from "@/lib/billing/commercial-config";
import { retryCommercialWithdrawal, retryCommercialEmail, closeSupportFeedback } from "@/lib/actions/commercial-admin";

export default async function CommercialAdminPage() {
  await requireAdmin();
  if (!commercialRecordsEnabled()) return <section className="p-5"><h1 className="text-xl font-semibold">Suivi commercial</h1><p className="mt-3 text-sm">À activer après application de la migration des archives commerciales.</p></section>;
  const [withdrawals, emails, support] = await Promise.all([
    prisma.withdrawalRequest.findMany({ where: { status: { not: "COMPLETED" } }, orderBy: { receivedAt: "asc" }, take: 50 }),
    prisma.transactionalEmail.findMany({ where: { status: { in: ["PENDING", "FAILED", "NEEDS_REVIEW"] } }, orderBy: { createdAt: "asc" }, take: 50 }),
    prisma.feedback.findMany({ where: { status: { not: "CLOSED" } }, orderBy: { createdAt: "asc" }, take: 30 }),
  ]);
  return <div className="space-y-8 p-4 sm:p-6">
    <header><h1 className="text-2xl font-semibold">Suivi commercial et support</h1><p className="mt-3 text-sm leading-6 text-muted-foreground">Les demandes sont conservées avant leur traitement. Une erreur de remboursement ne doit jamais provoquer un second avoir. Les envois incertains depuis plus de 23 heures doivent être rapprochés du fournisseur avant un nouveau renvoi.</p></header>
    <section className="space-y-3"><h2 className="text-lg font-semibold">Rétractations à suivre</h2>{!withdrawals.length && <p className="text-sm">Aucune demande en attente.</p>}{withdrawals.map((row) => <article key={row.id} className="space-y-2 rounded-xl border border-border p-4"><p className="break-all text-sm font-semibold">{row.email} — {row.status}</p><p className="text-xs">Reçue le {dateForCustomer(row.receivedAt, "fr")} — {row.eligible ? "Délai respecté" : "Examen manuel hors délai"}</p><p className="break-all text-xs">Contrat : {row.subscriptionId} · Référence : {row.id}</p>{row.lastError && <p className="text-xs text-loss">{row.lastError}</p>}{row.eligible && <form action={retryCommercialWithdrawal}><input type="hidden" name="id" value={row.id} /><button className="min-h-touch rounded-lg border border-border px-3 py-2 text-sm">Reprendre le traitement</button></form>}</article>)}</section>
    <section className="space-y-3"><h2 className="text-lg font-semibold">Emails à suivre</h2>{!emails.length && <p className="text-sm">Aucun envoi en attente.</p>}{emails.map((row) => <article key={row.id} className="space-y-2 rounded-xl border border-border p-4"><p className="break-all text-sm font-semibold">{row.subject}</p><p className="break-all text-xs">{row.recipient} · {row.status} · {row.attemptCount} tentative(s)</p>{row.lastError && <p className="text-xs text-loss">{row.lastError}</p>}{row.status !== "NEEDS_REVIEW" && <form action={retryCommercialEmail}><input type="hidden" name="id" value={row.id} /><button className="min-h-touch rounded-lg border border-border px-3 py-2 text-sm">Réessayer l’envoi</button></form>}</article>)}</section>
    <section className="space-y-3"><h2 className="text-lg font-semibold">Clôture des échanges de support</h2>{support.map((row) => <article key={row.id} className="space-y-3 rounded-xl border border-border p-4"><p className="whitespace-pre-wrap text-sm">{row.message}</p><form action={closeSupportFeedback} className="space-y-3"><input type="hidden" name="id" value={row.id} /><label className="flex gap-3 text-sm"><input type="checkbox" name="legalHold" defaultChecked={row.legalHold} className="accent-primary" />Conserver pour un litige ou une obligation légale</label><button className="min-h-touch rounded-lg border border-border px-3 py-2 text-sm">Clôturer l’échange</button></form></article>)}</section>
  </div>;
}
