"use client";

import { useState } from "react";
import { Plus, Sparkle } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TipsterFormDrawer } from "@/components/tipsters/tipster-form-drawer";
import { normalizeTipsterName } from "@/lib/tipsters/normalize";
import type { TipsterOption } from "@/lib/tipsters/types";

const PERSONAL = "__personal__";
const ADD_TIPSTER = "__add_tipster__";

export function TipsterSelector({
  id,
  tipsters,
  value,
  detectedName,
  onChange,
  onTipsterCreated,
  allowCreate = true,
  label,
  creationOrigin = "management",
}: {
  id: string;
  tipsters: TipsterOption[];
  value: string | null | undefined;
  detectedName?: string | null;
  onChange: (tipsterId: string | null) => void;
  onTipsterCreated: (tipster: TipsterOption) => void;
  allowCreate?: boolean;
  label?: string;
  creationOrigin?: "management" | "import";
}) {
  const t = useTranslations("tipsters.selector");
  const [createOpen, setCreateOpen] = useState(false);
  const detectedKey = detectedName ? normalizeTipsterName(detectedName) : "";
  const detectedMatch = detectedKey
    ? tipsters.find((tipster) => tipster.status === "ACTIVE" && tipster.normalizedName === detectedKey)
    : undefined;
  const selectedValue = value === undefined ? detectedMatch?.id ?? PERSONAL : value ?? PERSONAL;
  const selected = tipsters.find((tipster) => tipster.id === selectedValue);
  const unknownDetected = Boolean(detectedKey && !detectedMatch && value === undefined);
  const items = Object.fromEntries([
    [PERSONAL, t("personal")],
    ...tipsters.filter((tipster) => tipster.status === "ACTIVE" || tipster.id === value)
      .map((tipster) => [tipster.id, tipster.name]),
    ...(allowCreate ? [[ADD_TIPSTER, t("add")]] : []),
  ]);

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label ?? t("label")}</Label>
      {unknownDetected ? (
        <div className="mb-1 rounded-xl border border-primary/30 bg-primary/8 p-3">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-primary">
            <Sparkle size={15} weight="fill" aria-hidden />
            {t("detected")}
          </p>
          <p className="mt-1 truncate text-sm font-medium">{detectedName}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button type="button" size="sm" onClick={() => setCreateOpen(true)} className="min-h-touch flex-1 rounded-lg text-xs">
              <Plus size={15} weight="bold" aria-hidden />
              {t("createAndAssociate")}
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => onChange(null)} className="min-h-touch rounded-lg text-xs">
              {t("keepPersonal")}
            </Button>
          </div>
        </div>
      ) : detectedMatch && value === undefined ? (
        <p className="mb-1 flex items-center gap-1.5 text-xs font-medium text-profit">
          <Sparkle size={14} weight="fill" aria-hidden />
          {t("matched", { name: detectedMatch.name })}
        </p>
      ) : null}

      <Select
        value={selectedValue}
        onValueChange={(nextValue) => {
          if (nextValue === ADD_TIPSTER) {
            setCreateOpen(true);
            return;
          }
          onChange(nextValue === PERSONAL ? null : nextValue as string);
        }}
        items={items}
      >
        <SelectTrigger id={id} className="min-h-touch w-full rounded-lg px-3 text-sm">
          <SelectValue>{selected?.name ?? t("personal")}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={PERSONAL}>{t("personal")}</SelectItem>
          {tipsters.filter((tipster) => tipster.status === "ACTIVE" || tipster.id === value).map((tipster) => (
            <SelectItem key={tipster.id} value={tipster.id}>
              {tipster.name}{tipster.status === "ARCHIVED" ? ` · ${t("archived")}` : ""}
            </SelectItem>
          ))}
          {allowCreate ? (
            <SelectItem value={ADD_TIPSTER} className="font-semibold text-primary">
              <Plus size={15} weight="bold" aria-hidden />
              {t("add")}
            </SelectItem>
          ) : null}
        </SelectContent>
      </Select>

      {createOpen ? (
        <TipsterFormDrawer
          key={detectedName ? `detected-${detectedKey}` : "selector-new"}
          open
          onOpenChange={setCreateOpen}
          defaultName={unknownDetected ? detectedName ?? "" : ""}
          origin={creationOrigin}
          selectExisting
          onSaved={(created) => {
            if (created.status !== "ACTIVE") return;
            onTipsterCreated({
              id: created.id,
              name: created.name,
              normalizedName: created.normalizedName,
              status: created.status,
            });
            onChange(created.id);
          }}
        />
      ) : null}
    </div>
  );
}
