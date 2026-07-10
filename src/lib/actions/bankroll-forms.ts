"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { createBankroll, updateBankroll } from "@/lib/actions/bankrolls";
import { getServerLocale } from "@/lib/i18n/get-server-locale";

// Wrappers FormData pour useActionState — même patron que src/app/auth/actions.ts.
// La validation/sécurité vit dans les actions de base (bankrolls.ts) ;
// ici on ne fait que parser le formulaire et traduire les erreurs.

export type BankrollFormState =
  | { error: string; success?: undefined }
  | { success: true; error?: undefined }
  | undefined;

function parseFields(formData: FormData) {
  return {
    name: String(formData.get("name") ?? ""),
    bookmaker: String(formData.get("bookmaker") ?? ""),
    initial: Number(formData.get("initial")),
  };
}

function revalidate() {
  // Route dynamique [locale] : le pattern avec crochets revalide toutes les
  // locales d'un coup (cf. commentaire équivalent dans account.ts).
  revalidatePath("/[locale]/bankrolls", "page");
  revalidatePath("/[locale]/dashboard", "page");
}

export async function createBankrollForm(
  _prevState: BankrollFormState,
  formData: FormData
): Promise<BankrollFormState> {
  const { name, bookmaker, initial } = parseFields(formData);

  try {
    await createBankroll(name, bookmaker, initial);
  } catch (e) {
    const t = await getTranslations({ locale: await getServerLocale(), namespace: "common" });
    return { error: e instanceof Error ? e.message : t("unexpectedError") };
  }

  revalidate();
  return { success: true };
}

export async function updateBankrollForm(
  _prevState: BankrollFormState,
  formData: FormData
): Promise<BankrollFormState> {
  const id = String(formData.get("id") ?? "");
  const { name, bookmaker, initial } = parseFields(formData);

  try {
    await updateBankroll(id, name, bookmaker, initial);
  } catch (e) {
    const t = await getTranslations({ locale: await getServerLocale(), namespace: "common" });
    return { error: e instanceof Error ? e.message : t("unexpectedError") };
  }

  revalidate();
  return { success: true };
}
