import { redirect } from "next/navigation";
import { requireAdminIdentity } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import { AdminSecurityForm } from "@/components/admin/admin-security-form";

export default async function AdminSecurityPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  await requireAdminIdentity();
  const supabase = await createClient();
  const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (error) throw new Error("La vérification de sécurité est momentanément indisponible.");
  if (data.currentLevel === "aal2") redirect(`/${locale}/admin`);
  const { data: factors, error: factorError } = await supabase.auth.mfa.listFactors();
  if (factorError) throw new Error("Les moyens de vérification sont momentanément indisponibles.");
  return <AdminSecurityForm locale={locale} initialFactorId={factors.totp[0]?.id ?? null} />;
}
