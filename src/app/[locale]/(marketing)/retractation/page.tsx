import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { commercialRecordsEnabled, dateForCustomer } from "@/lib/billing/commercial-config";
import { WithdrawalForm } from "@/components/account/withdrawal-form";
import { withdrawalAcknowledgement } from "@/lib/billing/withdrawals";

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  return { title: locale === "en" ? "Withdraw from my contract" : "Renoncer à mon contrat", robots: { index: false, follow: true } };
}
export default async function WithdrawalPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params; const en = locale === "en";
  const { data: { user } } = await (await createClient()).auth.getUser();
  const enabled = commercialRecordsEnabled();
  const contracts = enabled && user ? await prisma.billingContract.findMany({ where: { userId: user.id }, orderBy: { acceptedAt: "desc" }, take: 100 }) : [];
  const requests = enabled && user ? await prisma.withdrawalRequest.findMany({ where: { userId: user.id, subscriptionId: { in: contracts.map((contract) => contract.id) } } }) : [];
  const acknowledgements = requests.length ? await prisma.transactionalEmail.findMany({ where: { userId: user!.id, dedupeKey: { in: requests.map((request) => `withdrawal-ack:${request.id}`) } }, select: { dedupeKey: true, text: true } }) : [];
  const options = contracts.map((contract) => {
    const request = requests.find((item) => item.subscriptionId === contract.id);
    const storedAck = request && acknowledgements.find((item) => item.dedupeKey === `withdrawal-ack:${request.id}`);
    return { id: contract.id, name: contract.name, label: `${contract.billingInterval === "yearly" ? en ? "Annual" : "Annuel" : en ? "Monthly" : "Mensuel"} — ${dateForCustomer(contract.acceptedAt, locale)}`, deadline: dateForCustomer(new Date(contract.withdrawalDeadline.getTime() - 1), locale), ...(request ? { receipt: { acknowledgement: storedAck?.text ?? withdrawalAcknowledgement(request, contract.locale), reference: request.id, eligible: request.eligible } } : {}) };
  });
  return <article className="kalivoa-content-frame max-w-3xl space-y-6 py-12 sm:py-20">
    <h1 className="text-3xl font-semibold">{en ? "Withdraw from my contract" : "Renoncer à mon contrat"}</h1>
    <p className="text-sm leading-7 text-muted-foreground">{en ? "Within the applicable withdrawal period, Kalivoa refunds the relevant subscription in full, even if scans were used. This request is separate from stopping the next renewal." : "Dans le délai de rétractation applicable, Kalivoa rembourse intégralement la souscription concernée, même si des scans ont été utilisés. Cette demande est différente de l’arrêt du prochain renouvellement."}</p>
    {!enabled ? <p className="text-sm">{en ? "Online requests will open with paid subscriptions. You can contact support at contact.kalivoa@gmail.com." : "Les demandes en ligne ouvriront avec les abonnements payants. Tu peux contacter le support à contact.kalivoa@gmail.com."}</p>
      : !user ? <div className="space-y-3"><p className="text-sm">{en ? "Sign in to the account used for your subscription. You do not need to create a new account. If you cannot sign in, send your declaration by email." : "Connecte-toi au compte utilisé pour la souscription. Aucun nouveau compte n’est nécessaire. Si tu ne peux pas te connecter, adresse ta déclaration par email."}</p><Link href="/login" className="marketing-primary-cta">{en ? "Sign in" : "Me connecter"}</Link></div>
        : <WithdrawalForm email={user.email ?? ""} contracts={options} />}
    <Link href="/sales-terms#withdrawal" className="inline-flex min-h-touch items-center text-sm text-primary underline">{en ? "Read the withdrawal conditions" : "Lire les conditions de rétractation"}</Link>
  </article>;
}
