"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import {
  ArrowCounterClockwise,
  CheckCircle,
  DownloadSimple,
  FileArrowUp,
  FileCsv,
  FileJs,
  Info,
  WarningCircle,
} from "@phosphor-icons/react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { importExternalBets } from "@/lib/actions/import-bets";
import { normalizeBookmaker } from "@/lib/bookmakers";
import {
  MAX_IMPORT_FILE_BYTES,
  parseBetsFileContent,
  type ImportDateOrder,
  type ParsedBetsFile,
} from "@/lib/file-import/parse-bets-file";
import { TipsterSelector } from "@/components/tipsters/tipster-selector";
import { normalizeTipsterName } from "@/lib/tipsters/normalize";
import type { TipsterOption } from "@/lib/tipsters/types";

type BankrollOption = { id: string; name: string; bookmaker: string };

const KALIVOA_CSV_TEMPLATE = [
  "Date;Sport;BetType;Label;Odds;Stake;State;Bookmaker;Live;Freebet;Cashout;Comment",
  "2026-08-26 18:30;Football;Résultat du match;Paris gagne;1.85;10;W;Winamax;No;No;;Exemple",
].join("\r\n");

function downloadCsvTemplate() {
  const blob = new Blob([`\uFEFF${KALIVOA_CSV_TEMPLATE}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "modele-import-kalivoa.csv";
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function FileImportFlow({ bankrolls, tipsters: initialTipsters }: { bankrolls: BankrollOption[]; tipsters: TipsterOption[] }) {
  const t = useTranslations("fileImport");
  const tResults = useTranslations("results");
  const inputRef = useRef<HTMLInputElement>(null);
  const [bankrollId, setBankrollId] = useState(bankrolls[0]?.id ?? "");
  const [parsed, setParsed] = useState<ParsedBetsFile | null>(null);
  const [fileName, setFileName] = useState("");
  const [fileError, setFileError] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [result, setResult] = useState<{ imported: number; skippedDuplicates: number } | null>(null);
  const [isPending, startTransition] = useTransition();
  const [tipsters, setTipsters] = useState(initialTipsters);
  const [fallbackTipsterId, setFallbackTipsterId] = useState<string | null>(null);
  const [dateOrder, setDateOrder] = useState<ImportDateOrder>("AUTO");
  const [loadedFile, setLoadedFile] = useState<{ name: string; content: string } | null>(null);

  const validBets = useMemo(
    () => parsed?.rows.flatMap((row) => (row.bet ? [row.bet] : [])) ?? [],
    [parsed]
  );
  const invalidCount = parsed ? parsed.rows.length - validBets.length : 0;
  const warningCount = parsed?.rows.filter((row) => row.warnings.length > 0).length ?? 0;
  const selectedBankroll = bankrolls.find((bankroll) => bankroll.id === bankrollId);
  const selectedBookmaker = selectedBankroll ? normalizeBookmaker(selectedBankroll.bookmaker).toLocaleLowerCase("fr") : "";
  const bookmakerMismatch = Boolean(parsed && parsed.detectedBookmakers.length > 0 && (
    parsed.detectedBookmakers.length > 1
    || !parsed.detectedBookmakers.some((bookmaker) => normalizeBookmaker(bookmaker).toLocaleLowerCase("fr") === selectedBookmaker)
  ));
  const detectedTipsters = useMemo(() => {
    const groups = new Map<string, { name: string; value: string | null | undefined }>();
    for (const bet of validBets) {
      if (!bet.tipster) continue;
      const key = normalizeTipsterName(bet.tipster);
      if (!key || groups.has(key)) continue;
      groups.set(key, { name: bet.tipster, value: bet.tipsterId });
    }
    return Array.from(groups, ([key, group]) => ({ key, ...group }));
  }, [validBets]);
  const betsWithoutDetectedTipster = validBets.filter((bet) => !bet.tipster).length;

  function patchDetectedTipster(key: string, tipsterId: string | null) {
    setParsed((current) => current ? {
      ...current,
      rows: current.rows.map((row) => row.bet && row.bet.tipster && normalizeTipsterName(row.bet.tipster) === key
        ? { ...row, bet: { ...row.bet, tipsterId } }
        : row),
    } : current);
  }

  async function readFile(file: File | undefined) {
    if (!file) return;
    setFileError("");
    setResult(null);
    setFallbackTipsterId(null);
    if (file.size > MAX_IMPORT_FILE_BYTES) {
      setParsed(null);
      setFileError(t("errors.tooLarge"));
      return;
    }
    try {
      const content = await file.text();
      const nextParsed = parseBetsFileContent(file.name, content, { dateOrder });
      setParsed(nextParsed);
      setLoadedFile({ name: file.name, content });
      setFileName(file.name);
    } catch (error) {
      setParsed(null);
      setFileName(file.name);
      setFileError(error instanceof Error ? error.message : t("errors.read"));
    }
  }

  function changeDateOrder(value: string | null) {
    const nextOrder = (value ?? "AUTO") as ImportDateOrder;
    setDateOrder(nextOrder);
    if (!loadedFile) return;
    try {
      setParsed(parseBetsFileContent(loadedFile.name, loadedFile.content, { dateOrder: nextOrder }));
      setFileError("");
    } catch (error) {
      setFileError(error instanceof Error ? error.message : t("errors.read"));
    }
  }

  function confirmImport() {
    if (!parsed || validBets.length === 0 || !bankrollId) return;
    setFileError("");
    startTransition(async () => {
      try {
        const source = parsed.sourceProfile === "BET_ANALYTIX" ? "BET_ANALYTIX" : parsed.format;
        const response = await importExternalBets(
          bankrollId,
          validBets.map((bet) => !bet.tipster && bet.tipsterId === undefined
            ? { ...bet, tipsterId: fallbackTipsterId }
            : bet),
          source,
          fileName
        );
        if (response.imported === undefined) {
          setFileError(response.error);
          return;
        }
        setResult({ imported: response.imported, skippedDuplicates: response.skippedDuplicates });
      } catch {
        setFileError(t("errors.import"));
      }
    });
  }

  function reset() {
    setParsed(null);
    setFileName("");
    setFileError("");
    setResult(null);
    setFallbackTipsterId(null);
    setLoadedFile(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  if (result) {
    return (
      <section className="glass-card flex flex-1 flex-col items-center justify-center rounded-2xl p-6 text-center animate-fade-in-up lg:min-h-[30rem]">
        <span className="flex size-16 items-center justify-center rounded-full bg-profit/12 text-profit">
          <CheckCircle size={36} weight="fill" aria-hidden />
        </span>
        <h2 className="mt-4 text-xl font-semibold">{t("complete.title")}</h2>
        <p className="mt-2 max-w-lg text-sm leading-6 text-muted-foreground">
          {t("complete.description", { count: result.imported })}
        </p>
        {result.skippedDuplicates > 0 ? (
          <p className="mt-2 text-xs text-muted-foreground">
            {t("complete.duplicates", { count: result.skippedDuplicates })}
          </p>
        ) : null}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Button type="button" variant="outline" onClick={reset} className="min-h-touch rounded-lg">
            <ArrowCounterClockwise size={18} aria-hidden />
            {t("complete.another")}
          </Button>
          <Button render={<Link href="/history" />} className="min-h-touch rounded-lg">
            {t("complete.history")}
          </Button>
        </div>
      </section>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-5">
      <div className="grid gap-4 lg:max-w-3xl lg:grid-cols-2">
        <div className="grid gap-1.5">
        <Label htmlFor="file-import-bankroll" className="text-xs">{t("bankrollLabel")}</Label>
        <Select
          value={bankrollId}
          onValueChange={(value) => setBankrollId(value as string)}
          items={Object.fromEntries(bankrolls.map((bankroll) => [bankroll.id, `${bankroll.name} (${bankroll.bookmaker})`]))}
        >
          <SelectTrigger id="file-import-bankroll" className="min-h-touch w-full rounded-lg px-3 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {bankrolls.map((bankroll) => (
              <SelectItem key={bankroll.id} value={bankroll.id} className="min-h-touch text-sm">
                {bankroll.name} ({bankroll.bookmaker})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="file-import-date-order" className="text-xs">{t("dateOrder.label")}</Label>
          <Select
            value={dateOrder}
            onValueChange={changeDateOrder}
            items={{ AUTO: t("dateOrder.auto"), DMY: t("dateOrder.dmy"), MDY: t("dateOrder.mdy") }}
          >
            <SelectTrigger id="file-import-date-order" className="min-h-touch w-full rounded-lg px-3 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="AUTO">{t("dateOrder.auto")}</SelectItem>
              <SelectItem value="DMY">{t("dateOrder.dmy")}</SelectItem>
              <SelectItem value="MDY">{t("dateOrder.mdy")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".csv,.json,.tsv,.txt,text/csv,application/json,text/tab-separated-values,text/plain"
        className="hidden"
        onChange={(event) => void readFile(event.target.files?.[0])}
        aria-hidden
        tabIndex={-1}
      />

      {!parsed ? (
        <div
          onDragEnter={(event) => { event.preventDefault(); setIsDragging(true); }}
          onDragOver={(event) => event.preventDefault()}
          onDragLeave={(event) => { if (event.currentTarget === event.target) setIsDragging(false); }}
          onDrop={(event) => {
            event.preventDefault();
            setIsDragging(false);
            void readFile(event.dataTransfer.files[0]);
          }}
          className={`flex min-h-[25rem] flex-1 flex-col items-center justify-center rounded-2xl border border-dashed p-6 text-center transition-colors animate-fade-in-up ${isDragging ? "border-primary bg-primary/10" : "border-border bg-muted/15"}`}
        >
          <span className="flex size-20 items-center justify-center rounded-2xl bg-primary/12 text-primary">
            <FileArrowUp size={40} weight="duotone" aria-hidden />
          </span>
          <h2 className="mt-5 text-lg font-semibold">{t("drop.title")}</h2>
          <p className="mt-2 max-w-lg text-sm leading-6 text-muted-foreground">{t("drop.description")}</p>
          <Button type="button" onClick={() => inputRef.current?.click()} className="mt-5 min-h-touch rounded-lg px-5">
            {t("drop.choose")}
          </Button>
          <div className="mt-6 flex flex-wrap justify-center gap-2" aria-label={t("drop.formatsAriaLabel")}>
            <span className="flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-semibold"><FileCsv size={16} aria-hidden />CSV</span>
            <span className="flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-semibold"><FileJs size={16} aria-hidden />JSON</span>
            <span className="rounded-full border border-border bg-background px-3 py-1.5 text-xs font-semibold">TSV / TXT</span>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">{t("drop.limit")}</p>
        </div>
      ) : (
        <section className="glass-card rounded-2xl p-4 animate-fade-in-up sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">{parsed.format}</p>
              <h2 className="mt-1 break-all text-base font-semibold">{fileName}</h2>
              <p className="mt-1 text-xs text-muted-foreground">{t("preview.columns", { count: parsed.detectedColumns.length })}</p>
              <p className="mt-1 max-w-3xl text-[0.7rem] leading-5 text-muted-foreground">{parsed.detectedColumns.join(" · ")}</p>
            </div>
            <Button type="button" variant="outline" onClick={reset} disabled={isPending} className="min-h-touch rounded-lg">
              {t("preview.changeFile")}
            </Button>
          </div>

          {parsed.sourceProfile === "BET_ANALYTIX" ? (
            <div className="mt-5 rounded-xl border border-profit/30 bg-profit/10 p-4">
              <div className="flex items-start gap-3">
                <CheckCircle size={21} className="mt-0.5 shrink-0 text-profit" weight="fill" aria-hidden />
                <div>
                  <p className="text-sm font-semibold text-profit">{t("preview.betAnalytixDetected")}</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    {t("preview.betAnalytixDetails", { count: parsed.groupedSelectionRows })}
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          {parsed.detectedBookmakers.length > 0 ? (
            <div className={`mt-3 rounded-xl border p-3 text-xs leading-5 ${bookmakerMismatch ? "border-warning/30 bg-warning/10 text-warning" : "border-border bg-muted/30 text-muted-foreground"}`}>
              <span className="font-semibold">{t("preview.bookmakerDetected", { bookmakers: parsed.detectedBookmakers.join(", ") })}</span>
              {bookmakerMismatch ? ` ${t("preview.bookmakerMismatch", { selected: selectedBankroll?.bookmaker ?? "—" })}` : null}
            </div>
          ) : null}

          {(detectedTipsters.length > 0 || betsWithoutDetectedTipster > 0) ? (
            <section className="mt-5 rounded-xl border border-border bg-muted/20 p-3 sm:p-4" aria-labelledby="file-tipsters-title">
              <h3 id="file-tipsters-title" className="text-sm font-semibold">{t("tipsters.title")}</h3>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">{t("tipsters.description")}</p>
              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                {detectedTipsters.map((detected, index) => (
                  <TipsterSelector
                    key={detected.key}
                    id={`file-tipster-${index}`}
                    tipsters={tipsters}
                    value={detected.value}
                    detectedName={detected.name}
                    onChange={(tipsterId) => patchDetectedTipster(detected.key, tipsterId)}
                    onTipsterCreated={(tipster) => setTipsters((items) => [...items.filter((item) => item.id !== tipster.id), tipster])}
                    creationOrigin="import"
                  />
                ))}
                {betsWithoutDetectedTipster > 0 ? (
                  <TipsterSelector
                    id="file-tipster-default"
                    tipsters={tipsters}
                    value={fallbackTipsterId}
                    label={t("tipsters.defaultLabel", { count: betsWithoutDetectedTipster })}
                    onChange={setFallbackTipsterId}
                    onTipsterCreated={(tipster) => setTipsters((items) => [...items.filter((item) => item.id !== tipster.id), tipster])}
                    creationOrigin="import"
                  />
                ) : null}
              </div>
            </section>
          ) : null}

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl bg-profit/10 p-3"><p className="text-2xl font-semibold text-profit">{validBets.length}</p><p className="text-xs text-muted-foreground">{t("preview.valid")}</p></div>
            <div className="rounded-xl bg-loss/10 p-3"><p className="text-2xl font-semibold text-loss">{invalidCount}</p><p className="text-xs text-muted-foreground">{t("preview.invalid")}</p></div>
            <div className="rounded-xl bg-primary/10 p-3"><p className="text-2xl font-semibold text-primary">{warningCount}</p><p className="text-xs text-muted-foreground">{t("preview.warnings")}</p></div>
          </div>

          <div className="mt-5 overflow-x-auto rounded-xl border border-border">
            <table className="w-full min-w-[48rem] text-left text-xs">
              <thead className="bg-muted/60 text-muted-foreground">
                <tr><th className="p-3">{t("table.row")}</th><th className="p-3">{t("table.date")}</th><th className="p-3">{t("table.bet")}</th><th className="p-3">{t("table.stake")}</th><th className="p-3">{t("table.odds")}</th><th className="p-3">{t("table.result")}</th><th className="p-3">{t("table.status")}</th></tr>
              </thead>
              <tbody>
                {parsed.rows.slice(0, 50).map((row) => (
                  <tr key={row.sourceRow} className="border-t border-border align-top">
                    <td className="p-3 text-muted-foreground">{row.sourceRow}</td>
                    <td className="p-3">{row.bet?.date ?? "—"}</td>
                    <td className="max-w-sm p-3"><p className="font-medium">{row.bet?.description || `${row.bet?.sport ?? "—"} · ${row.bet?.betType ?? "—"}`}</p>{row.warnings.length > 0 ? <p className="mt-1 text-warning">{row.warnings.join(" · ")}</p> : null}</td>
                    <td className="p-3">{row.bet?.stake ?? "—"}</td>
                    <td className="p-3">{row.bet?.odds ?? "—"}</td>
                    <td className="p-3">{row.bet ? tResults(row.bet.result) : "—"}</td>
                    <td className="p-3">{row.errors.length > 0 ? <span className="inline-flex items-center gap-1 text-loss"><WarningCircle size={15} weight="fill" aria-hidden />{row.errors.join(" · ")}</span> : <span className="inline-flex items-center gap-1 text-profit"><CheckCircle size={15} weight="fill" aria-hidden />{t("table.ready")}</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {parsed.rows.length > 50 ? <p className="mt-2 text-xs text-muted-foreground">{t("preview.firstRows", { count: 50, total: parsed.rows.length })}</p> : null}
          {invalidCount > 0 ? <p className="mt-4 rounded-xl border border-warning/30 bg-warning/10 p-3 text-xs leading-5 text-warning">{t("preview.invalidSkipped", { count: invalidCount })}</p> : null}

          <Button type="button" onClick={confirmImport} disabled={validBets.length === 0 || isPending} className="mt-5 min-h-touch w-full rounded-lg text-sm font-semibold">
            {isPending ? t("preview.importing") : t("preview.import", { count: validBets.length })}
          </Button>
        </section>
      )}

      {!parsed ? (
        <section className="glass-card rounded-2xl p-4 sm:p-5" aria-labelledby="file-import-documentation">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary"><Info size={21} weight="duotone" aria-hidden /></span>
              <div>
                <h2 id="file-import-documentation" className="text-base font-semibold">{t("documentation.title")}</h2>
                <p className="mt-1 max-w-2xl text-xs leading-5 text-muted-foreground">{t("documentation.description")}</p>
              </div>
            </div>
            <Button type="button" variant="outline" onClick={downloadCsvTemplate} className="min-h-touch shrink-0 rounded-lg">
              <DownloadSimple size={18} aria-hidden />
              {t("documentation.downloadTemplate")}
            </Button>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <div className="rounded-xl border border-border bg-muted/25 p-4">
              <h3 className="text-sm font-semibold">{t("documentation.requiredTitle")}</h3>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">{t("documentation.requiredFields")}</p>
            </div>
            <div className="rounded-xl border border-border bg-muted/25 p-4">
              <h3 className="text-sm font-semibold">{t("documentation.resultsTitle")}</h3>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">{t("documentation.resultsValues")}</p>
            </div>
            <div className="rounded-xl border border-border bg-muted/25 p-4 md:col-span-2">
              <h3 className="text-sm font-semibold">{t("documentation.betAnalytixTitle")}</h3>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">{t("documentation.betAnalytixDescription")}</p>
            </div>
            <div className="rounded-xl border border-border bg-muted/25 p-4 md:col-span-2">
              <h3 className="text-sm font-semibold">{t("documentation.notImportedTitle")}</h3>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">{t("documentation.notImportedDescription")}</p>
            </div>
          </div>
        </section>
      ) : null}

      {fileError ? <p role="alert" className="rounded-xl border border-loss/30 bg-loss/10 p-3 text-sm text-loss">{fileError}</p> : null}
    </div>
  );
}
