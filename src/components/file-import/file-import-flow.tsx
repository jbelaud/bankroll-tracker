"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import {
  ArrowCounterClockwise,
  CheckCircle,
  FileArrowUp,
  FileCsv,
  FileJs,
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
import {
  MAX_IMPORT_FILE_BYTES,
  parseBetsFileContent,
  type ParsedBetsFile,
} from "@/lib/file-import/parse-bets-file";

type BankrollOption = { id: string; name: string; bookmaker: string };

export function FileImportFlow({ bankrolls }: { bankrolls: BankrollOption[] }) {
  const t = useTranslations("fileImport");
  const inputRef = useRef<HTMLInputElement>(null);
  const [bankrollId, setBankrollId] = useState(bankrolls[0]?.id ?? "");
  const [parsed, setParsed] = useState<ParsedBetsFile | null>(null);
  const [fileName, setFileName] = useState("");
  const [fileError, setFileError] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [result, setResult] = useState<{ imported: number; skippedDuplicates: number } | null>(null);
  const [isPending, startTransition] = useTransition();

  const validBets = useMemo(
    () => parsed?.rows.flatMap((row) => (row.bet ? [row.bet] : [])) ?? [],
    [parsed]
  );
  const invalidCount = parsed ? parsed.rows.length - validBets.length : 0;
  const warningCount = parsed?.rows.filter((row) => row.warnings.length > 0).length ?? 0;

  async function readFile(file: File | undefined) {
    if (!file) return;
    setFileError("");
    setResult(null);
    if (file.size > MAX_IMPORT_FILE_BYTES) {
      setParsed(null);
      setFileError(t("errors.tooLarge"));
      return;
    }
    try {
      const nextParsed = parseBetsFileContent(file.name, await file.text());
      setParsed(nextParsed);
      setFileName(file.name);
    } catch (error) {
      setParsed(null);
      setFileName(file.name);
      setFileError(error instanceof Error ? error.message : t("errors.read"));
    }
  }

  function confirmImport() {
    if (!parsed || validBets.length === 0 || !bankrollId) return;
    setFileError("");
    startTransition(async () => {
      try {
        const response = await importExternalBets(bankrollId, validBets, parsed.format);
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
      <div className="grid gap-1.5 lg:max-w-md">
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
            </div>
            <Button type="button" variant="outline" onClick={reset} disabled={isPending} className="min-h-touch rounded-lg">
              {t("preview.changeFile")}
            </Button>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl bg-profit/10 p-3"><p className="text-2xl font-semibold text-profit">{validBets.length}</p><p className="text-xs text-muted-foreground">{t("preview.valid")}</p></div>
            <div className="rounded-xl bg-loss/10 p-3"><p className="text-2xl font-semibold text-loss">{invalidCount}</p><p className="text-xs text-muted-foreground">{t("preview.invalid")}</p></div>
            <div className="rounded-xl bg-primary/10 p-3"><p className="text-2xl font-semibold text-primary">{warningCount}</p><p className="text-xs text-muted-foreground">{t("preview.warnings")}</p></div>
          </div>

          <div className="mt-5 overflow-x-auto rounded-xl border border-border">
            <table className="w-full min-w-[42rem] text-left text-xs">
              <thead className="bg-muted/60 text-muted-foreground">
                <tr><th className="p-3">{t("table.row")}</th><th className="p-3">{t("table.date")}</th><th className="p-3">{t("table.bet")}</th><th className="p-3">{t("table.stake")}</th><th className="p-3">{t("table.odds")}</th><th className="p-3">{t("table.status")}</th></tr>
              </thead>
              <tbody>
                {parsed.rows.slice(0, 50).map((row) => (
                  <tr key={row.sourceRow} className="border-t border-border align-top">
                    <td className="p-3 text-muted-foreground">{row.sourceRow}</td>
                    <td className="p-3">{row.bet?.date ?? "—"}</td>
                    <td className="max-w-sm p-3"><p className="font-medium">{row.bet?.description || `${row.bet?.sport ?? "—"} · ${row.bet?.betType ?? "—"}`}</p>{row.warnings.length > 0 ? <p className="mt-1 text-warning">{row.warnings.join(" · ")}</p> : null}</td>
                    <td className="p-3">{row.bet?.stake ?? "—"}</td>
                    <td className="p-3">{row.bet?.odds ?? "—"}</td>
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

      {fileError ? <p role="alert" className="rounded-xl border border-loss/30 bg-loss/10 p-3 text-sm text-loss">{fileError}</p> : null}
    </div>
  );
}
