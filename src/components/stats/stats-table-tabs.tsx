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
}: {
  sportTable: ReactNode;
  typeTable: ReactNode;
  bookmakerTable: ReactNode;
}) {
  const t = useTranslations("stats.tableTabs");

  return (
    <Tabs defaultValue="sport" className="flex flex-col gap-3">
      <TabsList className="grid min-h-touch w-full grid-cols-3 gap-1 bg-transparent p-0">
        {[
          { value: "sport", label: t("sport") },
          { value: "type", label: t("type") },
          { value: "bookmaker", label: t("bookmaker") },
        ].map((tab) => (
          <TabsTrigger
            key={tab.value}
            value={tab.value}
            className="min-h-touch rounded-lg border border-input bg-transparent px-1 text-xs data-active:border-primary/50 data-active:bg-primary/10 data-active:text-primary"
          >
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>
      <TabsContent value="sport">{sportTable}</TabsContent>
      <TabsContent value="type">{typeTable}</TabsContent>
      <TabsContent value="bookmaker">{bookmakerTable}</TabsContent>
    </Tabs>
  );
}
