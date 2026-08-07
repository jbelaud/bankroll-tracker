"use client";

import { useState, type ReactNode } from "react";
import { CalendarBlank, FunnelSimple, X } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

export function StatsWorkspace({
  filters,
  calendar,
  children,
  hasActiveFilters,
}: {
  filters: ReactNode;
  calendar: ReactNode;
  children: ReactNode;
  hasActiveFilters: boolean;
}) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const t = useTranslations("stats.workspace");

  return (
    <>
      <div className="flex flex-col gap-4">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold">{t("title")}</h1>
            <p className="mt-1 text-xs text-muted-foreground">{t("subtitle")}</p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setFiltersOpen(true)}
              className="inline-flex min-h-touch items-center gap-1.5 rounded-xl border border-input bg-background px-3 text-xs font-semibold transition-colors hover:bg-muted"
            >
              <FunnelSimple size={15} weight="bold" aria-hidden />
              {t("filters")}
              {hasActiveFilters && <span className="size-1.5 rounded-full bg-primary" aria-label={t("filtersActive")} />}
            </button>
            <button
              type="button"
              onClick={() => setCalendarOpen(true)}
              className="inline-flex min-h-touch items-center gap-1.5 rounded-xl border border-input bg-background px-3 text-xs font-semibold transition-colors hover:bg-muted"
            >
              <CalendarBlank size={15} weight="bold" aria-hidden />
              {t("calendar")}
            </button>
          </div>
        </header>

        {hasActiveFilters && (
          <div className="flex items-center justify-between rounded-xl border border-primary/30 bg-primary/10 px-3 py-2 text-xs text-primary">
            <span>{t("filtered")}</span>
            <a href="?" className="font-semibold underline underline-offset-2">{t("clearFilters")}</a>
          </div>
        )}

        {children}
      </div>

      <Drawer open={filtersOpen} onOpenChange={setFiltersOpen} swipeDirection="left">
        <DrawerContent className="overflow-y-auto border-border">
          <DrawerHeader className="flex-row items-center justify-between border-b border-border p-4">
            <DrawerTitle className="text-base">{t("filters")}</DrawerTitle>
            <button
              type="button"
              onClick={() => setFiltersOpen(false)}
              aria-label={t("close")}
              className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X size={18} aria-hidden />
            </button>
          </DrawerHeader>
          <div className="p-4 pb-[max(env(safe-area-inset-bottom),1.5rem)]">{filters}</div>
        </DrawerContent>
      </Drawer>

      <Drawer open={calendarOpen} onOpenChange={setCalendarOpen} showSwipeHandle>
        <DrawerContent className="rounded-t-2xl">
          <DrawerHeader className="flex-row items-center justify-between p-4 pb-0">
            <DrawerTitle className="text-base">{t("calendar")}</DrawerTitle>
            <button
              type="button"
              onClick={() => setCalendarOpen(false)}
              aria-label={t("close")}
              className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X size={18} aria-hidden />
            </button>
          </DrawerHeader>
          <div className="p-4 pb-[max(env(safe-area-inset-bottom),1.5rem)]">{calendar}</div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
