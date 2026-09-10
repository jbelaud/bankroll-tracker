import { CaretDown, CheckCircle, Info, ShieldCheck } from "@phosphor-icons/react/dist/ssr";

const PROOF_LEVELS = [
  { label: "Preuve complète", detail: "Ticket scanné avant l’événement, puis résultat confirmé par un second scan.", tone: "text-profit", icon: <ShieldCheck size={17} weight="fill" aria-hidden /> },
  { label: "Preuve partielle", detail: "Ticket scanné avant l’événement, mais résultat renseigné manuellement.", tone: "text-primary", icon: <CheckCircle size={17} weight="fill" aria-hidden /> },
  { label: "Preuve limitée", detail: "Une preuve existe, mais elle ne permet pas de confirmer tout le cycle du pari.", tone: "text-warning", icon: <Info size={17} weight="fill" aria-hidden /> },
  { label: "Non certifié", detail: "Pari ajouté entièrement à la main, sans preuve vérifiable par Kalivoa.", tone: "text-muted-foreground", icon: <Info size={17} aria-hidden /> },
];

export function CertificationExplainer({ className = "" }: { className?: string }) {
  return <details className={`group overflow-hidden rounded-2xl border border-border bg-card/30 ${className}`}>
    <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 marker:hidden hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary [&::-webkit-details-marker]:hidden">
      <div><h2 className="text-sm font-semibold">Comment Kalivoa vérifie les paris ?</h2><p className="mt-0.5 text-xs text-muted-foreground">Le score mesure la qualité des preuves, jamais l’argent réel du tipster.</p></div>
      <CaretDown size={17} className="shrink-0 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden />
    </summary>
    <div className="border-t border-border p-4">
      <p className="text-xs leading-relaxed text-muted-foreground">Plus les mises accompagnées de preuves complètes représentent une grande part du volume total en unités, plus le score est élevé. Les ajouts manuels et les corrections restent visibles et réduisent le niveau de confiance.</p>
      <ul className="mt-4 grid gap-2 sm:grid-cols-2">{PROOF_LEVELS.map((level) => <li key={level.label} className="flex gap-3 rounded-xl border border-border bg-background/30 p-3"><span className={`mt-0.5 shrink-0 ${level.tone}`}>{level.icon}</span><div><strong className="block text-xs">{level.label}</strong><span className="mt-1 block text-xs leading-relaxed text-muted-foreground">{level.detail}</span></div></li>)}</ul>
      <p className="mt-4 rounded-xl bg-primary/10 px-3 py-2.5 text-xs font-medium text-primary">En clair : Kalivoa ne promet pas qu’il est impossible de tricher. Kalivoa montre le niveau de preuve derrière chaque pari.</p>
    </div>
  </details>;
}
