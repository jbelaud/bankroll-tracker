"use client";

import { useCallback, useState } from "react";
import { useTranslations } from "next-intl";
import type { Currency } from "@prisma/client";
import { ArrowSquareOut, CheckCircle, DiscordLogo } from "@phosphor-icons/react";
import { useRouter } from "@/i18n/navigation";
import { scanTickets, type ScanTicketResult } from "@/lib/scan/scan-client";
import type { ParsedBet } from "@/lib/scan/types";
import { importBets } from "@/lib/actions/import-bets";
import { finalBetsForScan } from "@/lib/scan/quality";
import type { Taxonomy } from "@/lib/taxonomy";
import { UploadZone } from "./upload-zone";
import { ScanningView } from "./scanning-view";
import { ReviewList } from "./review-list";
import { Button } from "@/components/ui/button";

export type BankrollOption = { id: string; name: string; bookmaker: string };

// Machine à états sur une seule route : les File[] vivent en mémoire,
// une navigation les perdrait — le contenu se transforme en place.
type FlowState =
  | { step: "idle" }
  | { step: "scanning"; files: File[]; done: number }
  | { step: "review"; bets: ParsedBet[]; files: File[]; scans: ScanTicketResult[] }
  | { step: "importing"; bets: ParsedBet[]; files: File[]; scans: ScanTicketResult[] }
  | { step: "completed"; imported: number; firstImport: boolean };

export function ScanFlow({
  bankrolls,
  currency,
  taxonomy,
}: {
  bankrolls: BankrollOption[];
  currency: Currency;
  taxonomy: Taxonomy;
}) {
  const router = useRouter();
  const t = useTranslations("scan.error");
  const tComplete = useTranslations("scan.complete");
  const [bankrollId, setBankrollId] = useState(bankrolls[0]?.id ?? "");
  const [flow, setFlow] = useState<FlowState>({ step: "idle" });
  const [error, setError] = useState("");

  const startScan = useCallback(
    async (files: File[]) => {
      if (files.length === 0) return;
      setError("");
      setFlow({ step: "scanning", files, done: 0 });
      try {
        const { bets, scans } = await scanTickets(files, bankrollId, (done) =>
          setFlow({ step: "scanning", files, done })
        );
        setFlow({ step: "review", bets, files, scans });
      } catch (e) {
        setError(e instanceof Error ? e.message : t("analysisFailed"));
        setFlow({ step: "idle" });
      }
    },
    [bankrollId, t]
  );

  const restart = useCallback(() => {
    setError("");
    setFlow({ step: "idle" });
  }, []);

  const confirmImport = useCallback(
    async (bets: ParsedBet[], shareQuality: boolean, files: File[], scans: ScanTicketResult[]) => {
      setError("");
      setFlow({ step: "importing", bets, files, scans });
      const result = await importBets(bankrollId, bets);
      if (result.imported === undefined) {
        setError(result.error);
        setFlow({ step: "review", bets, files, scans });
        return;
      }
      if (shareQuality) {
        await Promise.allSettled(scans.map((scan, index) => {
          const finalExtraction = finalBetsForScan(bets, index);
          const form = new FormData();
          form.append("consent", "true");
          form.append("bankrollId", bankrollId);
          form.append("image", files[index]);
          form.append("rawExtraction", JSON.stringify(scan.rawExtraction));
          form.append("finalExtraction", JSON.stringify(finalExtraction));
          form.append("model", scan.model);
          if (scan.detectedBookmaker) form.append("detectedBookmaker", scan.detectedBookmaker);
          if (scan.detectionConfidence !== null) form.append("detectionConfidence", String(scan.detectionConfidence));
          return fetch("/api/scan-quality", { method: "POST", body: form });
        }));
      }
      setFlow({
        step: "completed",
        imported: result.imported,
        firstImport: result.firstImport,
      });
    },
    [bankrollId]
  );

  if (flow.step === "scanning") {
    return (
      <ScanningView
        files={flow.files}
        done={flow.done}
        total={flow.files.length}
      />
    );
  }

  if (flow.step === "review" || flow.step === "importing") {
    return (
      <ReviewList
        initialBets={flow.bets}
        importing={flow.step === "importing"}
        error={error}
        onConfirm={(bets, shareQuality) => confirmImport(bets, shareQuality, flow.files, flow.scans)}
        onRestart={restart}
        bankrolls={bankrolls}
        bankrollId={bankrollId}
        onBankrollChange={setBankrollId}
        detectedBookmakers={Array.from(new Set(
          flow.scans
            .filter((scan) => scan.detectionConfidence !== null && scan.detectionConfidence >= 0.75)
            .flatMap((scan) => (scan.detectedBookmaker ? [scan.detectedBookmaker] : []))
        ))}
        showQualityOffer={flow.scans.some((scan) => scan.supportStatus !== "TESTED")}
        currency={currency}
        taxonomy={taxonomy}
      />
    );
  }

  if (flow.step === "completed") {
    const title = flow.firstImport ? tComplete("firstTitle") : tComplete("title");
    const description = flow.firstImport
      ? tComplete("firstDescription", { count: flow.imported })
      : tComplete("description", { count: flow.imported });

    return (
      <section
        aria-label={title}
        className="glass-card mx-auto flex w-full max-w-md flex-col items-center gap-5 rounded-2xl p-6 text-center"
      >
        <span className="flex size-14 items-center justify-center rounded-full bg-profit/15 text-profit">
          <CheckCircle size={34} weight="fill" aria-hidden />
        </span>
        <div>
          <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{description}</p>
        </div>

        {flow.firstImport ? (
          <div className="w-full rounded-xl border border-primary/35 bg-primary/10 p-4 text-left">
            <div className="flex gap-3">
              <DiscordLogo size={24} weight="fill" className="mt-0.5 shrink-0 text-primary" aria-hidden />
              <div>
                <h3 className="text-sm font-semibold">{tComplete("discordTitle")}</h3>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{tComplete("discordDescription")}</p>
              </div>
            </div>
            <a
              href="https://discord.gg/aMc8jDAAx"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 flex min-h-touch items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition-transform active:scale-[0.98]"
            >
              {tComplete("joinDiscord")}
              <ArrowSquareOut size={16} aria-hidden />
            </a>
          </div>
        ) : null}

        <Button
          type="button"
          variant={flow.firstImport ? "outline" : "default"}
          onClick={() => router.push("/dashboard")}
          className="min-h-touch w-full rounded-lg text-sm font-semibold"
        >
          {tComplete("dashboardCta")}
        </Button>
      </section>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-3">
      {error && (
        <p role="alert" className="text-xs text-loss">
          {error}
        </p>
      )}
      <UploadZone
        bankrolls={bankrolls}
        bankrollId={bankrollId}
        onBankrollChange={setBankrollId}
        onFilesSelected={startScan}
      />
    </div>
  );
}
