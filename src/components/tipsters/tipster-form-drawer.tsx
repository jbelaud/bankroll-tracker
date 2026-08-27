"use client";

import { useState, useTransition } from "react";
import type { TipsterPlatform } from "@prisma/client";
import { useTranslations } from "next-intl";
import { createTipster, updateTipster, type TipsterDto } from "@/lib/actions/tipsters";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const NO_PLATFORM = "__none__";
const PLATFORMS = ["DISCORD", "TELEGRAM", "X", "WEBSITE", "OTHER"] as const;

export type TipsterFormValue = {
  id: string;
  name: string;
  platform: TipsterPlatform | null;
  notes: string | null;
};

export function TipsterFormDrawer({
  open,
  onOpenChange,
  tipster,
  defaultName = "",
  origin = "management",
  onSaved,
  selectExisting = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tipster?: TipsterFormValue;
  defaultName?: string;
  origin?: "management" | "import";
  onSaved: (tipster: TipsterDto, existing: boolean) => void;
  selectExisting?: boolean;
}) {
  const t = useTranslations("tipsters.form");
  const tPlatforms = useTranslations("tipsters.platforms");
  const [name, setName] = useState(tipster?.name ?? defaultName);
  const [platform, setPlatform] = useState<TipsterPlatform | null>(tipster?.platform ?? null);
  const [notes, setNotes] = useState(tipster?.notes ?? "");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const editing = Boolean(tipster);

  const submit = () => {
    setError("");
    startTransition(async () => {
      const result = editing
        ? await updateTipster(tipster!.id, { name, platform, notes })
        : await createTipster({ name, platform, notes }, origin);

      if (!result.success) {
        setError(result.error);
        return;
      }
      if (result.existing && result.tipster.status === "ARCHIVED") {
        setError(t("archivedDuplicate"));
        return;
      }
      if (result.existing && !selectExisting) {
        setError(t("duplicate"));
        return;
      }
      onSaved(result.tipster, result.existing);
      onOpenChange(false);
    });
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange} showSwipeHandle>
      <DrawerContent className="rounded-t-2xl">
        <DrawerHeader>
          <DrawerTitle>{editing ? t("editTitle") : t("createTitle")}</DrawerTitle>
          <DrawerDescription>{editing ? t("editDescription") : t("createDescription")}</DrawerDescription>
        </DrawerHeader>
        <div className="overflow-y-auto">
          <form
            className="flex flex-col gap-4 p-4 pb-[max(env(safe-area-inset-bottom),1.5rem)]"
            onSubmit={(event) => {
              event.preventDefault();
              submit();
            }}
          >
            <div className="flex flex-col gap-1.5 text-left">
              <Label htmlFor="tipster-name">{t("nameLabel")}</Label>
              <Input
                id="tipster-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={120}
                required
                autoFocus
                placeholder={t("namePlaceholder")}
                className="min-h-touch rounded-lg px-3 text-sm"
              />
            </div>

            <div className="flex flex-col gap-1.5 text-left">
              <Label htmlFor="tipster-platform">{t("platformLabel")}</Label>
              <Select
                value={platform ?? NO_PLATFORM}
                onValueChange={(value) => setPlatform(value === NO_PLATFORM ? null : value as TipsterPlatform)}
                items={Object.fromEntries([
                  [NO_PLATFORM, tPlatforms("none")],
                  ...PLATFORMS.map((value) => [value, tPlatforms(value)]),
                ])}
              >
                <SelectTrigger id="tipster-platform" className="min-h-touch w-full rounded-lg px-3 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_PLATFORM}>{tPlatforms("none")}</SelectItem>
                  {PLATFORMS.map((value) => (
                    <SelectItem key={value} value={value}>{tPlatforms(value)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5 text-left">
              <Label htmlFor="tipster-notes">{t("notesLabel")}</Label>
              <textarea
                id="tipster-notes"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                maxLength={2000}
                rows={4}
                placeholder={t("notesPlaceholder")}
                className="min-h-24 resize-y rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50"
              />
            </div>

            {error ? <p role="alert" className="text-sm text-loss">{error}</p> : null}

            <Button type="submit" disabled={isPending} className="min-h-touch w-full rounded-lg text-sm font-semibold">
              {isPending ? t("saving") : editing ? t("save") : t("create")}
            </Button>
          </form>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
