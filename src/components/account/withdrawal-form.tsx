"use client";

import { useState } from "react";
import { useLocale } from "next-intl";
import { submitWithdrawal } from "@/lib/actions/withdrawal";

type Receipt = { acknowledgement: string; reference: string; eligible: boolean };
type ContractOption = { id: string; label: string; deadline: string; name: string; receipt?: Receipt };
export function WithdrawalForm({ contracts, email }: { contracts: ContractOption[]; email: string }) {
  const en = useLocale() === "en";
  const [subscriptionId, setSubscriptionId] = useState(contracts[0]?.id ?? "");
  const [name, setName] = useState(contracts[0]?.name ?? "");
  const [review, setReview] = useState(false); const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [receipt, setReceipt] = useState<Receipt | null>(contracts[0]?.receipt ?? null);
  const selected = contracts.find((contract) => contract.id === subscriptionId);
  const confirm = async () => {
    setLoading(true); setError("");
    try { const result = await submitWithdrawal({ subscriptionId, name, email, confirmed: true }); if ("error" in result) setError(result.error); else setReceipt(result); }
    catch { setError(en ? "Unable to send. You can retry or contact support." : "Impossible d’envoyer la demande. Tu peux réessayer ou contacter le support."); }
    finally { setLoading(false); }
  };
  const download = () => {
    if (!receipt) return;
    const url = URL.createObjectURL(new Blob([receipt.acknowledgement], { type: "text/plain;charset=utf-8" }));
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = `Kalivoa-retractation-${receipt.reference}.txt`; anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  if (receipt) return <section aria-labelledby="withdrawal-received" className="space-y-4 rounded-xl border border-border p-5">
    <h2 id="withdrawal-received" className="text-lg font-semibold">{en ? "Request recorded" : "Demande enregistrée"}</h2>
    <p role="status" className="text-sm leading-6">{en ? "Your declaration has been recorded. An acknowledgement is queued for your account email; you can download your copy now." : "Ta déclaration est enregistrée. L’accusé de réception est prévu par email à l’adresse de ton compte ; tu peux télécharger ta copie dès maintenant."}</p>
    <p className="break-all text-sm">{en ? "Reference" : "Référence"} : {receipt.reference}</p>
    {!receipt.eligible && <p className="text-sm leading-6">{en ? "The recorded deadline has passed. Your request will be reviewed; an automatic refund is not promised." : "Le délai enregistré est dépassé. Ta demande sera examinée ; un remboursement automatique n’est pas promis."}</p>}
    <button type="button" onClick={download} className="min-h-touch rounded-lg border border-border px-4 py-3 text-sm font-semibold">{en ? "Download my acknowledgement" : "Télécharger mon accusé de réception"}</button>
    {contracts.length > 1 && <label className="block text-sm">{en ? "Another subscription" : "Autre abonnement"}<select value={subscriptionId} onChange={(event) => { const contract = contracts.find((item) => item.id === event.target.value); setSubscriptionId(event.target.value); setName(contract?.name ?? ""); setReceipt(contract?.receipt ?? null); setReview(false); }} className="mt-2 min-h-touch w-full rounded-lg border border-border bg-card px-3 py-2">{contracts.map((contract) => <option key={contract.id} value={contract.id}>{contract.label}</option>)}</select></label>}
  </section>;
  if (!contracts.length) return <p className="text-sm leading-6">{en ? "No recorded paid contract is available for this account. If needed, send a clear declaration to contact.kalivoa@gmail.com." : "Aucun contrat payant enregistré n’est disponible pour ce compte. Si nécessaire, adresse une déclaration claire à contact.kalivoa@gmail.com."}</p>;
  return <section aria-labelledby="withdrawal-title" className="space-y-4 rounded-xl border border-border p-5">
    <h2 id="withdrawal-title" className="text-lg font-semibold">{en ? "Withdraw from my contract" : "Renoncer à mon contrat"}</h2>
    {!review ? <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); setReview(true); }}>
      <label className="block text-sm">{en ? "Subscription" : "Abonnement"}<select value={subscriptionId} onChange={(event) => { const contract = contracts.find((item) => item.id === event.target.value); setSubscriptionId(event.target.value); setName(contract?.name ?? ""); setReceipt(contract?.receipt ?? null); }} className="mt-2 min-h-touch w-full rounded-lg border border-border bg-card px-3 py-2">{contracts.map((contract) => <option key={contract.id} value={contract.id}>{contract.label}</option>)}</select></label>
      <label className="block text-sm">{en ? "First and last name" : "Nom et prénom"}<input required minLength={2} maxLength={160} autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} className="mt-2 min-h-touch w-full rounded-lg border border-border bg-card px-3 py-2" /></label>
      <p className="break-all text-sm">{en ? "Acknowledgement email" : "Email pour l’accusé de réception"} : {email}</p>
      <p className="text-sm leading-6 text-muted-foreground">{en ? "Recorded withdrawal deadline" : "Fin du délai de rétractation enregistrée"} : {selected?.deadline}. {en ? "The request is separate from cancellation at renewal." : "Cette demande est distincte d’une résiliation au renouvellement."}</p>
      <button type="submit" className="min-h-touch rounded-lg border border-border px-4 py-3 text-sm font-semibold">{en ? "Review my declaration" : "Vérifier ma déclaration"}</button>
    </form> : <div className="space-y-4">
      <dl className="space-y-2 text-sm"><dt className="font-semibold">{en ? "Contract" : "Contrat"}</dt><dd className="break-all">{selected?.label} — {subscriptionId}</dd><dt className="font-semibold">{en ? "Name" : "Nom et prénom"}</dt><dd>{name}</dd><dt className="font-semibold">Email</dt><dd className="break-all">{email}</dd></dl>
      <p className="text-sm leading-6">{en ? "I declare that I withdraw from this Kalivoa subscription contract. Within the applicable 14-day deadline, I request a full refund, including if scans were used. Paid access will end when the request is processed." : "Je déclare me rétracter de ce contrat d’abonnement Kalivoa. Dans le délai applicable de 14 jours, je demande un remboursement intégral, y compris si des scans ont été utilisés. L’accès payant prendra fin lors du traitement de la demande."}</p>
      {error && <p role="alert" className="text-sm text-loss">{error}</p>}
      <div className="flex flex-wrap gap-3"><button type="button" disabled={loading} onClick={() => setReview(false)} className="min-h-touch rounded-lg border border-border px-4 py-3 text-sm">{en ? "Edit" : "Modifier"}</button><button type="button" disabled={loading} onClick={confirm} className="min-h-touch rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground">{loading ? (en ? "Sending…" : "Envoi…") : (en ? "Confirm withdrawal" : "Confirmer la rétractation")}</button></div>
    </div>}
  </section>;
}
