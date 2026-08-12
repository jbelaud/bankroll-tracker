"use server";

import { getTranslations } from "next-intl/server";
import { getServerLocale } from "@/lib/i18n/get-server-locale";
import { createBankrollMovement } from "@/lib/actions/bankroll-movements";

export type BankrollMovementFormState = { error?: string; success?: true } | undefined;

export async function createBankrollMovementForm(
  _previousState: BankrollMovementFormState,
  formData: FormData
): Promise<BankrollMovementFormState> {
  const dateValue = String(formData.get("date") ?? "");
  const date = dateValue ? new Date(`${dateValue}T12:00:00`) : new Date();
  try {
    await createBankrollMovement(
      String(formData.get("bankrollId") ?? ""),
      String(formData.get("type") ?? ""),
      Number(formData.get("amount")),
      String(formData.get("note") ?? ""),
      date
    );
    return { success: true };
  } catch (error) {
    const t = await getTranslations({ locale: await getServerLocale(), namespace: "common" });
    return { error: error instanceof Error ? error.message : t("unexpectedError") };
  }
}
