"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import type { Currency } from "@prisma/client";
import { ArrowSquareOut, CheckCircle, DiscordLogo, WarningCircle } from "@phosphor-icons/react";
import { useRouter } from "@/i18n/navigation";
import { scanTickets, type ScanTicketResult } from "@/lib/scan/scan-client";
import type { ParsedBet } from "@/lib/scan/types";
import { importBets } from "@/lib/actions/import-bets";
import {
  createScanDraft,
  deleteScanDraft,
  updateScanDraft,
  type PendingScanDraft,
  type ScanDraftPayload,
} from "@/lib/actions/scan-drafts";
import { correctionSummary, finalBetsForScan } from "@/lib/scan/quality";
import { trackPublicGrowthEvent } from "@/lib/growth/client";
import type { Taxonomy } from "@/lib/taxonomy";
import { UploadZone } from "./upload-zone";
import { ScanningView } from "./scanning-view";
import { ReviewList } from "./review-list";
import { Button } from "@/components/ui/button";
import type { TipsterOption } from "@/lib/tipsters/types";

export type BankrollOption = { id: string; name: string; bookmaker: string };

// Machine à états sur une seule route : les File[] vivent en mémoire,
// une navigation les perdrait — le contenu se transforme en place.
type FlowState =
  | { step: "idle" }
  | { step: "scanning"; files: File[]; done: number }
  | { step: "review"; draftId: string | null; bets: ParsedBet[]; excludedIndexes: number[]; files: File[]; scans: ScanTicketResult[]; skippedDuplicateFiles: string[] }
  | { step: "empty"; files: File[]; scans: ScanTicketResult[]; skippedDuplicateFiles: string[] }
  | { step: "importing"; draftId: string | null; bets: ParsedBet[]; files: File[]; scans: ScanTicketResult[]; skippedDuplicateFiles: string[] }
  | { step: "completed"; imported: number; firstImport: boolean; earnedReferralScans: number };

export function ScanFlow({
  bankrolls,
  currency,
  taxonomy,
  pendingDrafts,
  tipsters,
}: {
  bankrolls: BankrollOption[];
  currency: Currency;
  taxonomy: Taxonomy;
  pendingDrafts: PendingScanDraft[];
  tipsters: TipsterOption[];
}) {
  const router = useRouter();
  const t = useTranslations("scan.error");
  const tComplete = useTranslations("scan.complete");
  const tReferral = useTranslations("referral");
  const tEmpty = useTranslations("scan.empty");
  const tPending = useTranslations("scan.pending");
  const [bankrollId, setBankrollId] = useState(bankrolls[0]?.id ?? "");
  const [flow, setFlow] = useState<FlowState>({ step: "idle" });
  const [error, setError] = useState("");
  const [sharingEmpty, setSharingEmpty] = useState(false);
  const [emptyShared, setEmptyShared] = useState(false);

  const buildDraftPayload = useCallback((bets: ParsedBet[], scans: ScanTicketResult[], skippedDuplicateFiles: string[], excludedIndexes: number[] = []): ScanDraftPayload => ({
    bets,
    excludedIndexes,
    scans,
    skippedDuplicateFiles,
  }), []);

  useEffect(() => {
    void trackPublicGrowthEvent("scan_opened", { language: document.documentElement.lang || "fr" });
  }, []);

  const startScan = useCallback(
    async (files: File[]) => {
      if (files.length === 0) return;
      setError("");
      setFlow({ step: "scanning", files, done: 0 });
      void trackPublicGrowthEvent("screenshots_selected", { screenshots_count: files.length });
      void trackPublicGrowthEvent("scan_started", { screenshots_count: files.length });
      try {
        const { bets, scans, skippedDuplicateFiles } = await scanTickets(files, bankrollId, (done) =>
          setFlow({ step: "scanning", files, done })
        );
        if (bets.length === 0) {
          setFlow({ step: "empty", files, scans, skippedDuplicateFiles });
        } else {
          void trackPublicGrowthEvent("verification_started", {
            screenshots_count: files.length,
            bets_detected: bets.length,
          });
          const draftId = await createScanDraft(
            bankrollId,
            buildDraftPayload(bets, scans, skippedDuplicateFiles)
          ).catch(() => null);
          setFlow({ step: "review", draftId, bets, excludedIndexes: [], files, scans, skippedDuplicateFiles });
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : t("analysisFailed"));
        setFlow({ step: "idle" });
      }
    },
    [bankrollId, buildDraftPayload, t]
  );

  const restart = useCallback(() => {
    if ((flow.step === "review" || flow.step === "importing") && flow.draftId) {
      void deleteScanDraft(flow.draftId);
    }
    setError("");
    setEmptyShared(false);
    setFlow({ step: "idle" });
  }, [flow]);

  const confirmImport = useCallback(
    async (bets: ParsedBet[], shareQuality: boolean, qualityIssueType: string, qualityIssueDetails: string, files: File[], scans: ScanTicketResult[], skippedDuplicateFiles: string[]) => {
      setError("");
      const draftId = (flow.step === "review" || flow.step === "importing") ? flow.draftId : null;
      setFlow({ step: "importing", draftId, bets, files, scans, skippedDuplicateFiles });
      const scanMeasurements = scans.map((scan) => {
        const finalExtraction = finalBetsForScan(bets, scan.sourceFileIndex);
        const corrections = correctionSummary(scan.rawExtraction, finalExtraction);
        return {
          scanUsageId: scan.usageId,
          betsExcluded: Math.max(0, scan.bets.length - finalExtraction.length),
          fieldsCorrectedCount: corrections.count,
          correctedFields: corrections.types,
        };
      });
      const result = await importBets(
        bankrollId,
        bets,
        scans.map((scan) => scan.usageId),
        scanMeasurements
      );
      if (result.imported === undefined) {
        setError(result.error);
        setFlow({ step: "review", draftId, bets, excludedIndexes: [], files, scans, skippedDuplicateFiles });
        return;
      }
      if (shareQuality) {
        await Promise.allSettled(scans.map((scan) => {
          const finalExtraction = finalBetsForScan(bets, scan.sourceFileIndex);
          const image = files[scan.sourceFileIndex];
          if (!image) return Promise.resolve();
          const form = new FormData();
          form.append("consent", "true");
          form.append("issueType", qualityIssueType);
          if (qualityIssueDetails) form.append("issueDetails", qualityIssueDetails);
          form.append("bankrollId", bankrollId);
          form.append("image", image);
          form.append("rawExtraction", JSON.stringify(scan.rawExtraction));
          form.append("finalExtraction", JSON.stringify(finalExtraction));
          form.append("model", scan.model);
          if (scan.detectedBookmaker) form.append("detectedBookmaker", scan.detectedBookmaker);
          if (scan.detectionConfidence !== null) form.append("detectionConfidence", String(scan.detectionConfidence));
          return fetch("/api/scan-quality", { method: "POST", body: form });
        }));
      }
      if (draftId) await deleteScanDraft(draftId);
      setFlow({
        step: "completed",
        imported: result.imported,
        firstImport: result.firstImport,
        earnedReferralScans: scans.reduce((sum, scan) => sum + scan.earnedReferralScans, 0),
      });
    },
    [bankrollId, flow]
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

  if (flow.step === "empty") {
    const shareEmptyScans = async () => {
      setSharingEmpty(true);
      const results = await Promise.allSettled(flow.scans.map((scan) => {
        const image = flow.files[scan.sourceFileIndex];
        if (!image) return Promise.resolve(new Response(null, { status: 204 }));
        const form = new FormData();
        form.append("consent", "true");
        form.append("issueType", "INCOMPLETE");
        form.append("bankrollId", bankrollId);
        form.append("image", image);
        form.append("rawExtraction", JSON.stringify(scan.rawExtraction));
        form.append("finalExtraction", "[]");
        form.append("model", scan.model);
        if (scan.detectedBookmaker) form.append("detectedBookmaker", scan.detectedBookmaker);
        if (scan.detectionConfidence !== null) form.append("detectionConfidence", String(scan.detectionConfidence));
        return fetch("/api/scan-quality", { method: "POST", body: form });
      }));
      setEmptyShared(results.some((result) => result.status === "fulfilled" && result.value.ok));
      setSharingEmpty(false);
    };
    return (
      <section className="glass-card mx-auto flex w-full max-w-md flex-col items-center gap-5 rounded-2xl p-6 text-center">
        <span className="flex size-14 items-center justify-center rounded-full bg-warning/15 text-warning"><WarningCircle size={34} weight="fill" aria-hidden /></span>
        <div>
          <h2 className="text-xl font-semibold tracking-tight">{flow.skippedDuplicateFiles.length > 0 && flow.scans.length === 0 ? tEmpty("duplicateTitle") : tEmpty("title")}</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{flow.skippedDuplicateFiles.length > 0 && flow.scans.length === 0 ? tEmpty("duplicateDescription", { files: flow.skippedDuplicateFiles.join(", ") }) : tEmpty("description")}</p>
        </div>
        {emptyShared ? <p role="status" className="w-full rounded-xl border border-profit/30 bg-profit/10 px-3 py-2 text-sm text-profit">{tEmpty("shared")}</p> : <>
          <p className="rounded-xl border border-border bg-muted/40 p-3 text-left text-xs leading-5 text-muted-foreground">{tEmpty("privacy")}</p>
          <Button type="button" onClick={shareEmptyScans} disabled={sharingEmpty} className="min-h-touch w-full rounded-lg text-sm font-semibold">{sharingEmpty ? tEmpty("sharing") : tEmpty("share")}</Button>
        </>}
        <Button type="button" variant="outline" onClick={restart} disabled={sharingEmpty} className="min-h-touch w-full rounded-lg text-sm font-semibold">{tEmpty("retry")}</Button>
      </section>
    );
  }

  if (flow.step === "review" || flow.step === "importing") {
    return (
      <ReviewList
        initialBets={flow.bets}
        importing={flow.step === "importing"}
        error={error}
        skippedDuplicateFiles={flow.skippedDuplicateFiles}
        onConfirm={(bets, shareQuality, qualityIssueType, qualityIssueDetails) => confirmImport(bets, shareQuality, qualityIssueType, qualityIssueDetails, flow.files, flow.scans, flow.skippedDuplicateFiles)}
        onRestart={restart}
        bankrolls={bankrolls}
        bankrollId={bankrollId}
        onBankrollChange={setBankrollId}
        initialExcludedIndexes={flow.step === "review" ? flow.excludedIndexes : []}
        onReviewChange={(bets, excludedIndexes, selectedBankrollId) => {
          if (!flow.draftId) return;
          void updateScanDraft(
            flow.draftId,
            selectedBankrollId,
            buildDraftPayload(bets, flow.scans, flow.skippedDuplicateFiles, excludedIndexes)
          ).catch(() => undefined);
        }}
        detectedBookmakers={Array.from(new Set(
          flow.scans
            .filter((scan) => scan.detectionConfidence !== null && scan.detectionConfidence >= 0.75)
            .flatMap((scan) => (scan.detectedBookmaker ? [scan.detectedBookmaker] : []))
        ))}
        showQualityOffer={flow.files.length > 0}
        currency={currency}
        taxonomy={taxonomy}
        initialTipsters={tipsters}
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

        {flow.earnedReferralScans > 0 ? (
          <p role="status" className="w-full rounded-xl border border-profit/30 bg-profit/10 px-3 py-2.5 text-left text-sm text-profit">
            {tReferral("referredRewardMessage", { count: flow.earnedReferralScans })}
          </p>
        ) : null}

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
          variant="outline"
          onClick={restart}
          className="min-h-touch w-full rounded-lg text-sm font-semibold"
        >
          {tComplete("scanAgainCta")}
        </Button>

        <Button
          type="button"
          variant="default"
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
      {pendingDrafts.length > 0 && (
        <section className="glass-card rounded-xl p-4">
          <h2 className="text-sm font-semibold">{tPending("title")}</h2>
          <p className="mt-1 text-xs text-muted-foreground">{tPending("description")}</p>
          <div className="mt-3 flex flex-col gap-2">
            {pendingDrafts.map((draft) => (
              <div key={draft.id} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 px-3 py-2">
                <span className="min-w-0 text-xs"><strong className="block truncate">{tPending("betCount", { count: draft.betCount })}</strong><span className="block truncate text-muted-foreground">{draft.bankrollName}</span></span>
                <Button size="sm" className="min-h-touch shrink-0 rounded-lg text-xs" onClick={() => {
                  setBankrollId(draft.bankrollId);
                  setError("");
                  setFlow({ step: "review", draftId: draft.id, bets: draft.payload.bets, excludedIndexes: draft.payload.excludedIndexes, files: [], scans: draft.payload.scans, skippedDuplicateFiles: draft.payload.skippedDuplicateFiles });
                }}>{tPending("resume")}</Button>
              </div>
            ))}
          </div>
        </section>
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
