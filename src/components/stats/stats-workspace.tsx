"use client";

import { createContext, useContext, useState, type CSSProperties, type ReactNode } from "react";
import { CalendarBlank, FunnelSimple, Sparkle, X } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { STATS_VIEWS, type StatsView } from "@/lib/stats-view";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

const StatsViewContext = createContext<StatsView>("general");

export function useStatsView() {
  return useContext(StatsViewContext);
}

export function StatsWorkspace({
  filters,
  calendar,
  views,
  hasActiveFilters,
  scopeNotice,
  initialPanel = null,
  initialView = "general",
}: {
  filters: ReactNode;
  calendar: ReactNode;
  views: Record<StatsView, ReactNode>;
  hasActiveFilters: boolean;
  scopeNotice?: string;
  initialPanel?: "filters" | "calendar" | null;
  initialView?: StatsView;
}) {
  const [filtersOpen, setFiltersOpen] = useState(initialPanel === "filters");
  const [calendarOpen, setCalendarOpen] = useState(initialPanel === "calendar");
  const [activeView, setActiveView] = useState<StatsView>(initialView);
  const t = useTranslations("stats.workspace");

  return (
    <StatsViewContext.Provider value={activeView}>
      <div className="flex flex-col gap-4">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold">{t("title")}</h1>
            <p className="mt-1 text-xs text-muted-foreground">{t("subtitle")}</p>
          </div>
          <div className="flex flex-wrap gap-2">
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
            <Link href="/ai-insights" className="inline-flex min-h-touch items-center gap-1.5 rounded-xl border border-primary/30 bg-primary/10 px-3 text-xs font-semibold text-primary transition-colors hover:bg-primary/20">
              <Sparkle size={15} weight="fill" aria-hidden />
              {t("aiLink")}
            </Link>
          </div>
        </header>

        {scopeNotice ? <p className="rounded-xl border border-primary/30 bg-primary/10 px-3 py-2 text-xs text-foreground">{scopeNotice}</p> : null}

        {hasActiveFilters && (
          <div className="flex items-center justify-between rounded-xl border border-primary/30 bg-primary/10 px-3 py-2 text-xs text-primary">
            <span>{t("filtered")}</span>
            <a href="?" className="font-semibold underline underline-offset-2">{t("clearFilters")}</a>
          </div>
        )}

        <Tabs value={activeView} onValueChange={(nextView) => {
          if (STATS_VIEWS.includes(nextView as StatsView)) setActiveView(nextView as StatsView);
        }} className="min-w-0 gap-0">
          <TabsList aria-label={t("viewsLabel")} className="no-scrollbar flex min-h-touch w-full max-w-full justify-start gap-1 overflow-x-auto border-b border-border bg-transparent p-0 pb-2">
            {STATS_VIEWS.map((view) => (
              <TabsTrigger
                key={view}
                value={view}
                className="min-h-10 shrink-0 flex-none rounded-lg border border-transparent px-3 text-xs font-semibold data-active:border-primary/40 data-active:bg-primary/10 data-active:text-primary"
              >
                {t(`views.${view}`)}
              </TabsTrigger>
            ))}
          </TabsList>
          {STATS_VIEWS.map((view) => (
            <TabsContent key={view} value={view} className="min-w-0 pt-5">
              {views[view]}
            </TabsContent>
          ))}
        </Tabs>
      </div>

      <Drawer open={filtersOpen} onOpenChange={setFiltersOpen} swipeDirection="left">
        <DrawerContent className="overflow-y-auto border-border" style={{ "--drawer-content-width": "min(100vw, 24rem)" } as CSSProperties}>
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

        <Drawer open={calendarOpen} onOpenChange={setCalendarOpen} swipeDirection="left">
          <DrawerContent className="overflow-y-auto border-border" style={{ "--drawer-content-width": "min(100vw, 26rem)" } as CSSProperties}>
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
    </StatsViewContext.Provider>
  );
}
