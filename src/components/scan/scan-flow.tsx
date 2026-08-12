"use client";

import { useCallback, useState } from "react";
import { useTranslations } from "next-intl";
import type { Currency } from "@prisma/client";
import { useRouter } from "@/i18n/navigation";
import { scanTickets, type ScanTicketResult } from "@/lib/scan/scan-client";
import type { ParsedBet } from "@/lib/scan/types";
import { importBets } from "@/lib/actions/import-bets";
import { finalBetsForScan } from "@/lib/scan/quality";
import type { Taxonomy } from "@/lib/taxonomy";
import { UploadZone } from "./upload-zone";
import { ScanningView } from "./scanning-view";
import { ReviewList } from "./review-list";

export type BankrollOption = { id: string; name: string; bookmaker: string };

// Machine à états sur une seule route : les File[] vivent en mémoire,
// une navigation les perdrait — le contenu se transforme en place.
type FlowState =
  | { step: "idle" }
  | { step: "scanning"; files: File[]; done: number }
  | { step: "review"; bets: ParsedBet[]; files: File[]; scans: ScanTicketResult[] }
  | { step: "importing"; bets: ParsedBet[]; files: File[]; scans: ScanTicketResult[] };

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
      if (result.error) {
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
      router.push("/dashboard");
    },
    [bankrollId, router]
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
        showQualityOffer={flow.scans.some((scan) => scan.supportStatus !== "TESTED")}
        currency={currency}
        taxonomy={taxonomy}
      />
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
