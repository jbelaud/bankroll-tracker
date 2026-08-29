"use client";

import { useState, useTransition } from "react";
import type { TipsterPlatform } from "@prisma/client";
import { Archive, ChartLineUp, PencilSimple, Plus, UserList } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { archiveTipster, type TipsterDto } from "@/lib/actions/tipsters";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { TipsterFormDrawer, type TipsterFormValue } from "@/components/tipsters/tipster-form-drawer";
import { Link } from "@/i18n/navigation";

export type TipsterManagerItem = {
  id: string;
  name: string;
  platform: TipsterPlatform | null;
  notes: string | null;
  status: "ACTIVE" | "ARCHIVED";
  betCount: number;
};

function mergeTipster(items: TipsterManagerItem[], saved: TipsterDto): TipsterManagerItem[] {
  const next = {
    id: saved.id,
    name: saved.name,
    platform: saved.platform,
    notes: saved.notes,
    status: saved.status,
    betCount: saved.betCount,
  } satisfies TipsterManagerItem;
  return [...items.filter((item) => item.id !== saved.id), next]
    .toSorted((a, b) => a.name.localeCompare(b.name));
}

function TipsterCard({
  tipster,
  onEdit,
  onArchive,
}: {
  tipster: TipsterManagerItem;
  onEdit: () => void;
  onArchive: () => void;
}) {
  const t = useTranslations("tipsters");
  const tPlatforms = useTranslations("tipsters.platforms");
  const archived = tipster.status === "ARCHIVED";

  return (
    <article className="glass-card flex flex-col gap-3 rounded-xl p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="truncate text-sm font-semibold">{tipster.name}</h3>
          <span className={archived
            ? "rounded-full bg-muted px-2 py-0.5 text-[0.65rem] font-semibold text-muted-foreground"
            : "rounded-full bg-profit/12 px-2 py-0.5 text-[0.65rem] font-semibold text-profit"}
          >
            {archived ? t("status.archived") : t("status.active")}
          </span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {tipster.platform ? tPlatforms(tipster.platform) : tPlatforms("none")}
          <span aria-hidden> · </span>
          {t("betCount", { count: tipster.betCount })}
        </p>
        {tipster.notes ? <p className="mt-2 line-clamp-2 text-xs leading-5 text-muted-foreground">{tipster.notes}</p> : null}
      </div>
      <div className="flex shrink-0 flex-wrap gap-2">
        <Button render={<Link href={`/tipsters/${tipster.id}`} />} variant="outline" className="min-h-touch flex-1 rounded-lg text-xs sm:flex-none">
          <ChartLineUp size={16} aria-hidden />
          {t("actions.details")}
        </Button>
        <Button type="button" variant="outline" onClick={onEdit} className="min-h-touch flex-1 rounded-lg text-xs sm:flex-none">
          <PencilSimple size={16} aria-hidden />
          {t("actions.edit")}
        </Button>
        {!archived ? (
          <Button type="button" variant="outline" onClick={onArchive} className="min-h-touch flex-1 rounded-lg text-xs text-muted-foreground sm:flex-none">
            <Archive size={16} aria-hidden />
            {t("actions.archive")}
          </Button>
        ) : null}
      </div>
    </article>
  );
}

export function TipsterManager({ initialTipsters }: { initialTipsters: TipsterManagerItem[] }) {
  const t = useTranslations("tipsters");
  const [tipsters, setTipsters] = useState(initialTipsters);
  const [formTarget, setFormTarget] = useState<TipsterFormValue | "new" | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<TipsterManagerItem | null>(null);
  const [archiveError, setArchiveError] = useState("");
  const [isArchiving, startArchiveTransition] = useTransition();
  const active = tipsters.filter((tipster) => tipster.status === "ACTIVE");
  const archived = tipsters.filter((tipster) => tipster.status === "ARCHIVED");

  const openEdit = (tipster: TipsterManagerItem) => setFormTarget({
    id: tipster.id,
    name: tipster.name,
    platform: tipster.platform,
    notes: tipster.notes,
  });

  const confirmArchive = () => {
    if (!archiveTarget) return;
    setArchiveError("");
    startArchiveTransition(async () => {
      const result = await archiveTipster(archiveTarget.id);
      if (!result.success) {
        setArchiveError(result.error);
        return;
      }
      setTipsters((items) => items.map((item) => item.id === archiveTarget.id
        ? { ...item, status: "ARCHIVED" }
        : item));
      setArchiveTarget(null);
    });
  };

  return (
    <>
      <div className="flex justify-end">
        <Button type="button" onClick={() => setFormTarget("new")} className="min-h-touch w-full rounded-lg text-sm font-semibold sm:w-auto">
          <Plus size={18} weight="bold" aria-hidden />
          {t("add")}
        </Button>
      </div>

      {tipsters.length === 0 ? (
        <section className="glass-card flex flex-col items-center gap-4 rounded-2xl px-5 py-12 text-center">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-primary/12 text-primary">
            <UserList size={30} weight="duotone" aria-hidden />
          </span>
          <div>
            <h2 className="text-base font-semibold">{t("empty.title")}</h2>
            <p className="mt-1 max-w-md text-sm leading-6 text-muted-foreground">{t("empty.description")}</p>
          </div>
          <Button type="button" onClick={() => setFormTarget("new")} className="min-h-touch rounded-lg text-sm font-semibold">
            <Plus size={18} weight="bold" aria-hidden />
            {t("add")}
          </Button>
        </section>
      ) : (
        <div className="grid gap-6 xl:grid-cols-2 xl:items-start">
          <section aria-labelledby="active-tipsters-title">
            <h2 id="active-tipsters-title" className="mb-3 text-sm font-semibold">{t("activeTitle", { count: active.length })}</h2>
            <div className="flex flex-col gap-3">
              {active.length > 0 ? active.map((tipster) => (
                <TipsterCard
                  key={tipster.id}
                  tipster={tipster}
                  onEdit={() => openEdit(tipster)}
                  onArchive={() => setArchiveTarget(tipster)}
                />
              )) : <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">{t("noActive")}</p>}
            </div>
          </section>

          {archived.length > 0 ? (
            <section aria-labelledby="archived-tipsters-title">
              <h2 id="archived-tipsters-title" className="mb-3 text-sm font-semibold text-muted-foreground">{t("archivedTitle", { count: archived.length })}</h2>
              <div className="flex flex-col gap-3 opacity-80">
                {archived.map((tipster) => (
                  <TipsterCard key={tipster.id} tipster={tipster} onEdit={() => openEdit(tipster)} onArchive={() => undefined} />
                ))}
              </div>
            </section>
          ) : null}
        </div>
      )}

      {formTarget ? (
        <TipsterFormDrawer
          key={formTarget === "new" ? "new" : formTarget.id}
          open
          onOpenChange={(open) => { if (!open) setFormTarget(null); }}
          tipster={formTarget === "new" ? undefined : formTarget}
          onSaved={(saved) => {
            setTipsters((items) => mergeTipster(items, saved));
            setFormTarget(null);
          }}
        />
      ) : null}

      <Drawer open={Boolean(archiveTarget)} onOpenChange={(open) => { if (!open) setArchiveTarget(null); }} showSwipeHandle>
        <DrawerContent className="rounded-t-2xl">
          <DrawerHeader>
            <DrawerTitle>{t("archive.title")}</DrawerTitle>
            <DrawerDescription>{t("archive.description", { name: archiveTarget?.name ?? "" })}</DrawerDescription>
          </DrawerHeader>
          <div className="flex flex-col gap-3 p-4 pb-[max(env(safe-area-inset-bottom),1.5rem)]">
            <p className="rounded-xl border border-border bg-muted/30 p-3 text-xs leading-5 text-muted-foreground">{t("archive.historyKept")}</p>
            {archiveError ? <p role="alert" className="text-sm text-loss">{archiveError}</p> : null}
            <Button type="button" onClick={confirmArchive} disabled={isArchiving} className="min-h-touch rounded-lg">
              {isArchiving ? t("archive.archiving") : t("archive.confirm")}
            </Button>
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
