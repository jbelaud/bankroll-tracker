import { ArrowRight, ShieldCheck } from "@phosphor-icons/react/dist/ssr";
import { Link } from "@/i18n/navigation";

type Tone = "neutral" | "profit" | "loss" | "warning";

export function PublicActivityCard({
  title, meta, bankrollName, bankrollSlug, odds, stake, personalStake,
  profit, result, resultTone, proof, isNew,
}: {
  title: string;
  meta: string;
  bankrollName: string;
  bankrollSlug: string;
  odds: string;
  stake: string;
  personalStake?: string;
  profit: string;
  result: string;
  resultTone: Tone;
  proof: string;
  isNew?: boolean;
}) {
  return <li className="glass-card overflow-hidden rounded-2xl">
    <div className="flex flex-col sm:flex-row sm:items-stretch">
      <div className="min-w-0 flex-1 p-4">
        <div className="flex flex-wrap items-center gap-2">
          {isNew ? <span className="rounded-full bg-primary px-2 py-0.5 text-[0.6rem] font-bold text-primary-foreground">Nouveau</span> : null}
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[0.6rem] font-semibold text-primary"><ShieldCheck size={12} weight="fill" aria-hidden /> {proof}</span>
        </div>
        <strong className="mt-2 block break-words text-sm sm:text-base">{title}</strong>
        <p className="mt-1 text-xs text-muted-foreground">{meta}</p>
        <Link href={`/p/${bankrollSlug}`} className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">{bankrollName} <ArrowRight size={13} aria-hidden /></Link>
      </div>
      <div className="grid grid-cols-3 border-t border-border sm:w-[25rem] sm:border-l sm:border-t-0">
        <Value label="Cote" value={odds} />
        <Value label="Mise" value={stake} detail={personalStake} />
        <Value label="Bénéfice" value={profit} tone={resultTone === "warning" ? "neutral" : resultTone} />
      </div>
      <div className={`flex min-h-9 items-center justify-center px-3 text-[0.65rem] font-bold sm:[writing-mode:vertical-rl] ${blockTone(resultTone)}`}>{result}</div>
    </div>
  </li>;
}

function Value({ label, value, detail, tone = "neutral" }: { label: string; value: string; detail?: string; tone?: Tone }) {
  const color = tone === "profit" ? "text-profit" : tone === "loss" ? "text-loss" : tone === "warning" ? "text-warning" : "text-foreground";
  return <div className="flex min-w-0 flex-col items-center justify-center border-r border-border p-3 text-center last:border-r-0"><span className="text-[0.6rem] uppercase text-muted-foreground">{label}</span><strong className={`num mt-1 truncate text-sm ${color}`}>{value}</strong>{detail ? <span className="mt-1 text-[0.65rem] font-semibold text-primary">{detail}</span> : null}</div>;
}

function blockTone(tone: Tone) {
  return tone === "profit" ? "bg-profit/15 text-profit" : tone === "loss" ? "bg-loss/15 text-loss" : tone === "warning" ? "bg-warning/15 text-warning" : "bg-primary/15 text-primary";
}
