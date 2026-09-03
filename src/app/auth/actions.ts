"use server";

import { headers } from "next/headers";
import { getTranslations } from "next-intl/server";
import { redirect as redirectToLocalized } from "@/i18n/navigation";
import { redirect } from "next/navigation";
import { getServerLocale as getLocale } from "@/lib/i18n/get-server-locale";
import { createClient } from "@/lib/supabase/server";
import { isBetaInviteTokenValid, redeemBetaInvite } from "@/lib/beta/program";
import { authErrorKey } from "@/lib/auth/error-mapping";
import { recordGrowthEventSafely } from "@/lib/growth/events";
import {
  attachStoredReferralToNewUser,
  storeReferralContext,
} from "@/lib/referral/service";

export type AuthFormState =
  | { error: string; errorCode?: "signupEmailRateLimited"; message?: undefined }
  | { message: string; email?: string; error?: undefined }
  | undefined;

export type PasswordFormState =
  | { error: string; message?: undefined }
  | { message: string; error?: undefined }
  | undefined;

async function getOrigin() {
  // Les redirections de confirmation/OAuth doivent revenir vers l'URL publique
  // configurée, jamais vers une valeur Host envoyée par un client. Ce repli
  // sur l'hôte de requête ne sert qu'au développement local.
  // En Preview, les variables Vercel sont elles aussi une source de confiance
  // et doivent primer sur l'URL canonique de production : Google et les e-mails
  // reviennent ainsi sur le déploiement que l'utilisateur est en train de tester.
  const configuredAppUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (configuredAppUrl) {
    return new URL(configuredAppUrl).origin;
  }

  const previewOrigin = getPreviewOrigin();
  if (previewOrigin) return previewOrigin;

  if (process.env.NODE_ENV === "production") {
    throw new Error("NEXT_PUBLIC_APP_URL doit être configuré en production");
  }

  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host = h.get("host");
  if (!host) throw new Error("Host manquant");
  return `${proto}://${host}`;
}

function getPreviewOrigin() {
  if (process.env.VERCEL_ENV !== "preview") return null;
  const host = process.env.VERCEL_BRANCH_URL || process.env.VERCEL_URL;
  return host ? `https://${host}` : null;
}

export async function requestPasswordReset(
  _previousState: PasswordFormState,
  formData: FormData
): Promise<PasswordFormState> {
  const email = String(formData.get("email") ?? "").normalize("NFKC").trim();
  const locale = await getLocale();
  const t = await getTranslations({ locale, namespace: "auth.passwordReset" });
  if (!email || !email.includes("@")) return { error: t("invalidEmail") };

  const origin = await getOrigin();
  const callback = new URL("/auth/callback", origin);
  callback.searchParams.set("next", `/${locale}/reset-password`);
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: callback.toString() });
  if (error) return { error: t("unavailable") };
  // Réponse volontairement identique même si l'adresse n'existe pas.
  return { message: t("sent") };
}

export async function updatePassword(
  _previousState: PasswordFormState,
  formData: FormData
): Promise<PasswordFormState> {
  const password = String(formData.get("password") ?? "");
  const confirmation = String(formData.get("confirmation") ?? "");
  const locale = await getLocale();
  const t = await getTranslations({ locale, namespace: "auth.passwordReset" });
  if (password.length < 8) return { error: t("passwordTooShort") };
  if (password !== confirmation) return { error: t("passwordMismatch") };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: t("expired") };
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: t("unavailable") };
  redirectToLocalized({ href: "/dashboard", locale });
}

type GrowthAttribution = {
  anonymousId: string;
  acquisitionSource: string;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
};

function growthAttributionFromForm(formData: FormData): GrowthAttribution {
  const read = (key: string) => String(formData.get(key) ?? "").slice(0, 120);
  return {
    anonymousId: read("growthAnonymousId"),
    acquisitionSource: read("acquisitionSource"),
    utmSource: read("utmSource"),
    utmMedium: read("utmMedium"),
    utmCampaign: read("utmCampaign"),
  };
}

function getAuthCallbackUrl(origin: string, locale: string, invite?: string, growth?: GrowthAttribution) {
  const callbackUrl = new URL("/auth/callback", origin);
  callbackUrl.searchParams.set("next", `/${locale}/dashboard`);
  if (invite) callbackUrl.searchParams.set("invite", invite);
  if (growth?.anonymousId) callbackUrl.searchParams.set("growthAnonymousId", growth.anonymousId);
  if (growth?.acquisitionSource) callbackUrl.searchParams.set("acquisitionSource", growth.acquisitionSource);
  if (growth?.utmSource) callbackUrl.searchParams.set("utmSource", growth.utmSource);
  if (growth?.utmMedium) callbackUrl.searchParams.set("utmMedium", growth.utmMedium);
  if (growth?.utmCampaign) callbackUrl.searchParams.set("utmCampaign", growth.utmCampaign);
  return callbackUrl.toString();
}

function signupProperties(growth: GrowthAttribution) {
  return {
    acquisition_source: growth.acquisitionSource || "direct",
    utm_source: growth.utmSource || null,
    utm_medium: growth.utmMedium || null,
    utm_campaign: growth.utmCampaign || null,
  };
}

export async function signIn(
  _prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const locale = await getLocale();
  const t = await getTranslations({ locale, namespace: "auth.errors" });

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: t(authErrorKey(error, "signIn")) };
  }

  redirectToLocalized({ href: "/dashboard", locale });
}

export async function signUp(
  _prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const invite = String(formData.get("invite") ?? "") || null;
  const referral = String(formData.get("referral") ?? "") || null;
  const growth = growthAttributionFromForm(formData);
  const locale = await getLocale();
  const t = await getTranslations({ locale, namespace: "auth.signup" });
  const tErrors = await getTranslations({ locale, namespace: "auth.errors" });

  if (password.length < 8) {
    return { error: t("passwordError") };
  }
  if (invite && !(await isBetaInviteTokenValid(invite, email))) {
    return { error: tErrors("betaInviteInvalid") };
  }

  // Le contexte signé survit à la confirmation d'e-mail et au détour OAuth,
  // sans laisser le code accessible au navigateur.
  await storeReferralContext(referral);

  const supabase = await createClient();
  const origin = await getOrigin();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: getAuthCallbackUrl(origin, locale, invite ?? undefined, growth) },
  });

  if (error) {
    const errorKey = authErrorKey(error, "signUp");
    return { error: tErrors(errorKey), errorCode: errorKey === "signupEmailRateLimited" ? errorKey : undefined };
  }

  if (!data.session) {
    return { message: t("confirmEmailMessage"), email };
  }
  if (data.user && invite) await redeemBetaInvite(invite, data.user);
  if (data.user) {
    await attachStoredReferralToNewUser(data.user.id);
    await recordGrowthEventSafely({
      name: "signup_completed",
      userId: data.user.id,
      anonymousId: growth.anonymousId || null,
      properties: signupProperties(growth),
    });
  }

  redirectToLocalized({ href: "/dashboard", locale });
}

export async function resendSignUpConfirmation(
  _prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "").normalize("NFKC").trim();
  const invite = String(formData.get("invite") ?? "") || null;
  const growth = growthAttributionFromForm(formData);
  const locale = await getLocale();
  const t = await getTranslations({ locale, namespace: "auth.signup" });
  const tErrors = await getTranslations({ locale, namespace: "auth.errors" });
  if (!email || !email.includes("@")) return { error: tErrors("invalidEmail") };

  const supabase = await createClient();
  const origin = await getOrigin();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
    options: { emailRedirectTo: getAuthCallbackUrl(origin, locale, invite ?? undefined, growth) },
  });
  if (error) {
    const errorKey = authErrorKey(error, "signUp");
    return { error: tErrors(errorKey), errorCode: errorKey === "signupEmailRateLimited" ? errorKey : undefined };
  }
  return { message: t("resendSuccess"), email };
}

export async function signInWithGoogle(formData: FormData) {
  const supabase = await createClient();
  const origin = await getOrigin();
  const locale = await getLocale();
  const invite = String(formData.get("invite") ?? "") || null;
  const referral = String(formData.get("referral") ?? "") || null;
  const growth = growthAttributionFromForm(formData);

  await storeReferralContext(referral);

  const callbackUrl = getAuthCallbackUrl(origin, locale, invite ?? undefined, growth);
  const parsedCallbackUrl = new URL(callbackUrl);
  console.info("[auth/google] Initialisation OAuth", {
    redirectOrigin: parsedCallbackUrl.origin,
    redirectPathname: parsedCallbackUrl.pathname,
    vercelEnvironment: process.env.VERCEL_ENV ?? null,
    gitBranch: process.env.VERCEL_GIT_COMMIT_REF ?? null,
    hasConfiguredAppUrl: Boolean(process.env.NEXT_PUBLIC_APP_URL),
  });

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: callbackUrl },
  });

  const url = data?.url;
  if (error || !url) {
    redirectToLocalized({
      href: { pathname: "/login", query: { error: "oauth_failed" } },
      locale,
    });
    return;
  }

  // URL fournie par Supabase/Google : elle est externe au routeur next-intl.
  redirect(url);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirectToLocalized({ href: "/login", locale: await getLocale() });
}
