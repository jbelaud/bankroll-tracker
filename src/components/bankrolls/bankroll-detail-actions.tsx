"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { PencilSimple, TrashSimple } from "@phosphor-icons/react";
import type { Currency } from "@prisma/client";
import { Button } from "@/components/ui/button";
import {
  BankrollFormDrawer,
  type BankrollFormTarget,
} from "./bankroll-form-drawer";
import { DeleteBankrollDrawer } from "./delete-bankroll-drawer";

export function BankrollDetailActions({
  bankroll,
  betCount,
  deleteAction,
  currency,
}: {
  bankroll: BankrollFormTarget;
  betCount: number;
  deleteAction: () => Promise<void>;
  currency: Currency;
}) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const t = useTranslations("common");

  return (
    <div className="flex gap-2">
      <Button
        variant="outline"
        onClick={() => setEditOpen(true)}
        className="min-h-touch flex-1 rounded-lg text-sm"
      >
        <PencilSimple size={16} aria-hidden />
        {t("edit")}
      </Button>
      <Button
        variant="destructive"
        onClick={() => setDeleteOpen(true)}
        className="min-h-touch flex-1 rounded-lg border border-loss/40 bg-loss-muted text-sm font-medium text-loss"
      >
        <TrashSimple size={16} aria-hidden />
        {t("delete")}
      </Button>

      <BankrollFormDrawer
        key={`${bankroll.id}-${bankroll.initial}`}
        open={editOpen}
        onOpenChange={setEditOpen}
        bankroll={bankroll}
        currency={currency}
      />
      <DeleteBankrollDrawer
        betCount={betCount}
        deleteAction={deleteAction}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
      />
    </div>
  );
}
