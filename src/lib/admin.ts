import "server-only";

import { notFound, redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { getServerLocale } from "@/lib/i18n/get-server-locale";

function configuredAdminEmails(): Set<string> {
  return new Set(
    (process.env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean)
  );
}

export function isAdminEmail(email: string | null | undefined): boolean {
  return !!email && configuredAdminEmails().has(email.trim().toLowerCase());
}

export type AdminAccess =
  | { status: "allowed"; user: User }
  | { status: "unauthenticated" | "forbidden" | "mfa_required" | "unavailable" };

export async function checkAdminAccess(requireMfa = true): Promise<AdminAccess> {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error && (!error.status || error.status >= 500) && error.name !== "AuthSessionMissingError") {
    return { status: "unavailable" };
  }
  if (!user) return { status: "unauthenticated" };
  if (user.is_anonymous || !user.email_confirmed_at || !isAdminEmail(user.email)) {
    return { status: "forbidden" };
  }
  if (requireMfa) {
    const { data, error: assuranceError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (assuranceError) return { status: "unavailable" };
    if (data.currentLevel !== "aal2") return { status: "mfa_required" };
  }
  return { status: "allowed", user };
}

async function requireAdminAccess(requireMfa: boolean) {
  const access = await checkAdminAccess(requireMfa);
  if (access.status === "allowed") return access.user;
  if (access.status === "forbidden") notFound();
  if (access.status === "unavailable") throw new Error("La vérification de sécurité est momentanément indisponible.");
  const locale = await getServerLocale();
  redirect(`/${locale}/${access.status === "unauthenticated" ? "login" : "admin/security"}`);
}

/** Only for the enrollment/challenge screen; never authorizes admin operations. */
export async function requireAdminIdentity() {
  return requireAdminAccess(false);
}

export async function requireAdmin() {
  return requireAdminAccess(true);
}
