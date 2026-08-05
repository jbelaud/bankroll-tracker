import "server-only";

import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";

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

export async function requireAdmin() {
  const user = await requireUser();
  if (!isAdminEmail(user.email)) notFound();
  return user;
}
