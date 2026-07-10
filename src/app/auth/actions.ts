"use server";

import { headers } from "next/headers";
import { getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { getServerLocale as getLocale } from "@/lib/i18n/get-server-locale";
import { createClient } from "@/lib/supabase/server";

export type AuthFormState =
  | { error: string; message?: undefined }
  | { message: string; error?: undefined }
  | undefined;

async function getOrigin() {
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host = h.get("host");
  return `${proto}://${host}`;
}

export async function signIn(
  _prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const locale = await getLocale();

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  redirect({ href: "/dashboard", locale });
}

export async function signUp(
  _prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const locale = await getLocale();
  const t = await getTranslations({ locale, namespace: "auth.signup" });

  if (password.length < 8) {
    return { error: t("passwordError") };
  }

  const supabase = await createClient();
  const origin = await getOrigin();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${origin}/auth/callback` },
  });

  if (error) {
    return { error: error.message };
  }

  if (!data.session) {
    return { message: t("confirmEmailMessage") };
  }

  redirect({ href: "/dashboard", locale });
}

export async function signInWithGoogle() {
  const supabase = await createClient();
  const origin = await getOrigin();
  const locale = await getLocale();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${origin}/auth/callback` },
  });

  const url = data?.url;
  if (error || !url) {
    redirect({
      href: { pathname: "/login", query: { error: error?.message ?? "" } },
      locale,
    });
    return;
  }

  redirect({ href: url, locale });
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect({ href: "/login", locale: await getLocale() });
}
