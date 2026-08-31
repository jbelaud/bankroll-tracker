"use client";

import type { Plan } from "@prisma/client";
import { FloppyDisk, Trash, WarningCircle } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { deleteAdminUser, updateAdminUserPlan } from "@/lib/actions/admin-users";

const PLANS: Plan[] = ["FREE", "BETA_TESTER", "BETA_PREMIUM", "PREMIUM"];

type Labels = {
  apply: string;
  cancel: string;
  changeTitle: string;
  changeDescription: string;
  confirmChange: string;
  delete: string;
  deleteTitle: string;
  deleteDescription: string;
  deleteInstruction: string;
  confirmDelete: string;
  stripeManaged: string;
  successPlan: string;
  plans: Record<Plan, string>;
};

export function AdminUserActions({
  userId,
  email,
  plan,
  stripeManaged,
  labels,
}: {
  userId: string;
  email: string;
  plan: Plan;
  stripeManaged: boolean;
  labels: Labels;
}) {
  const router = useRouter();
  const [selectedPlan, setSelectedPlan] = useState(plan);
  const [planDialogOpen, setPlanDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => setSelectedPlan(plan), [plan]);

  function changePlan() {
    startTransition(async () => {
      setError(null);
      setMessage(null);
      try {
        await updateAdminUserPlan(userId, selectedPlan);
        setPlanDialogOpen(false);
        setMessage(labels.successPlan);
        router.refresh();
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Une erreur est survenue.");
      }
    });
  }

  function deleteUser() {
    startTransition(async () => {
      setError(null);
      setMessage(null);
      try {
        await deleteAdminUser(userId);
        setDeleteDialogOpen(false);
        setDeleteConfirmation("");
        router.refresh();
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Une erreur est survenue.");
      }
    });
  }

  return (
    <div className="flex min-w-48 flex-col items-end gap-2">
      <div className="flex w-full items-center justify-end gap-1.5">
        <Select
          value={selectedPlan}
          onValueChange={(value) => setSelectedPlan(value as Plan)}
          disabled={stripeManaged || isPending}
        >
          <SelectTrigger size="sm" className="min-w-32" aria-label={labels.changeTitle}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="end">
            {PLANS.map((item) => <SelectItem key={item} value={item}>{labels.plans[item]}</SelectItem>)}
          </SelectContent>
        </Select>

        <AlertDialog open={planDialogOpen} onOpenChange={setPlanDialogOpen}>
          <AlertDialogTrigger
            render={<Button type="button" size="icon-sm" variant="outline" disabled={stripeManaged || isPending || selectedPlan === plan} />}
          >
            <FloppyDisk aria-hidden />
            <span className="sr-only">{labels.apply}</span>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{labels.changeTitle}</AlertDialogTitle>
              <AlertDialogDescription>{labels.changeDescription}</AlertDialogDescription>
            </AlertDialogHeader>
            <div className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs">
              <span className="font-medium">{email}</span>
              <span className="mt-1 block text-muted-foreground">{labels.plans[plan]} → {labels.plans[selectedPlan]}</span>
            </div>
            {error ? <p className="text-xs text-destructive" role="alert">{error}</p> : null}
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isPending}>{labels.cancel}</AlertDialogCancel>
              <AlertDialogAction onClick={changePlan} disabled={isPending}>{labels.confirmChange}</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={deleteDialogOpen} onOpenChange={(open) => {
          setDeleteDialogOpen(open);
          if (!open) setDeleteConfirmation("");
        }}>
          <AlertDialogTrigger
            render={<Button type="button" size="icon-sm" variant="destructive" disabled={stripeManaged || isPending} />}
          >
            <Trash aria-hidden />
            <span className="sr-only">{labels.delete}</span>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogMedia className="bg-destructive/10 text-destructive"><WarningCircle aria-hidden /></AlertDialogMedia>
              <AlertDialogTitle>{labels.deleteTitle}</AlertDialogTitle>
              <AlertDialogDescription>{labels.deleteDescription}</AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">{labels.deleteInstruction}</p>
              <code className="block break-all rounded-lg bg-muted px-3 py-2 text-xs text-foreground">{email}</code>
              <Input
                value={deleteConfirmation}
                onChange={(event) => setDeleteConfirmation(event.target.value)}
                placeholder={email}
                autoComplete="off"
                aria-label={labels.deleteInstruction}
              />
            </div>
            {error ? <p className="text-xs text-destructive" role="alert">{error}</p> : null}
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isPending}>{labels.cancel}</AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                onClick={deleteUser}
                disabled={isPending || deleteConfirmation.trim().toLowerCase() !== email.trim().toLowerCase()}
              >
                {labels.confirmDelete}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {stripeManaged ? <p className="max-w-52 text-right text-[0.65rem] leading-4 text-warning">{labels.stripeManaged}</p> : null}
      {message ? <p className="text-[0.65rem] text-profit" aria-live="polite">{message}</p> : null}
      {!planDialogOpen && !deleteDialogOpen && error ? <p className="max-w-52 text-right text-[0.65rem] text-destructive" role="alert">{error}</p> : null}
    </div>
  );
}
