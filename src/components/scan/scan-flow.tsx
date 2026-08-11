"use client";

import { useCallback, useState } from "react";
import { useTranslations } from "next-intl";
import type { Currency } from "@prisma/client";
import { useRouter } from "@/i18n/navigation";
import { scanTickets } from "@/lib/scan/scan-client";
import type { ParsedBet } from "@/lib/scan/types";
import { importBets } from "@/lib/actions/import-bets";
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
  | { step: "review"; bets: ParsedBet[] }
  | { step: "importing"; bets: ParsedBet[] };

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
        const bets = await scanTickets(files, (done) =>
          setFlow({ step: "scanning", files, done })
        );
        setFlow({ step: "review", bets });
      } catch (e) {
        setError(e instanceof Error ? e.message : t("analysisFailed"));
        setFlow({ step: "idle" });
      }
    },
    [t]
  );

  const restart = useCallback(() => {
    setError("");
    setFlow({ step: "idle" });
  }, []);

  const confirmImport = useCallback(
    async (bets: ParsedBet[]) => {
      setError("");
      setFlow({ step: "importing", bets });
      const result = await importBets(bankrollId, bets);
      if (result.error) {
        setError(result.error);
        setFlow({ step: "review", bets });
        return;
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
        onConfirm={confirmImport}
        onRestart={restart}
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
