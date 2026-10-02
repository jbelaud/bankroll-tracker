import "server-only";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { getPublicPartners } from "./catalogue";

// La vérification précède la lecture et la sérialisation des offres membres,
// même lorsque le rendu d'une page démarre avant celui du layout parent.
export async function getMemberPartnerOffers(locale: Locale) {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user || user.is_anonymous || !user.email) {
    redirect({ href: "/login", locale });
    return [];
  }
  return getPublicPartners();
}
