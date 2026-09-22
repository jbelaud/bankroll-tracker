"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Les tableaux (StatsTable) sont des Server Components async, rendus par la
// page serveur et passés ici tout faits — un Client Component ne peut pas
// instancier un composant serveur async directement dans son propre JSX.
export function StatsTableTabs({
  sportTable,
  typeTable,
  bookmakerTable,
  tipsterTable,
}: {
  sportTable: ReactNode;
  typeTable: ReactNode;
  bookmakerTable: ReactNode;
  tipsterTable: ReactNode;
}) {
  const t = useTranslations("stats.tableTabs");

  return (
    <Tabs defaultValue="sport" className="flex min-w-0 flex-col gap-3">
      <TabsList className="no-scrollbar flex min-h-touch w-full max-w-full justify-start gap-2 overflow-x-auto bg-transparent p-0 pb-1">
        {[
          { value: "sport", label: t("sport") },
          { value: "type", label: t("type") },
          { value: "bookmaker", label: t("bookmaker") },
          { value: "tipster", label: t("tipster") },
        ].map((tab) => (
          <TabsTrigger
            key={tab.value}
            value={tab.value}
            className="min-h-touch min-w-28 shrink-0 rounded-lg border border-input bg-transparent px-3 text-xs data-active:border-primary/50 data-active:bg-primary/10 data-active:text-primary"
          >
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>
      <TabsContent value="sport">{sportTable}</TabsContent>
      <TabsContent value="type">{typeTable}</TabsContent>
      <TabsContent value="bookmaker">{bookmakerTable}</TabsContent>
      <TabsContent value="tipster">{tipsterTable}</TabsContent>
    </Tabs>
  );
}
