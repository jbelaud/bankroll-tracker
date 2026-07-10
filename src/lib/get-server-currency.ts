import { cache } from "react";
import type { Currency } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

// Devise d'affichage de l'utilisateur connecté — lue en base (contrairement
// à la locale, qui vit dans un cookie). Enveloppé dans cache() pour ne payer
// qu'une seule requête Prisma par rendu de page, même si plusieurs Server
// Components l'appellent chacun de leur côté (même esprit que getLocale()
// de next-intl, qui lui est gratuit).
export const getServerCurrency = cache(async (): Promise<Currency> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return "EUR";

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { currency: true },
  });

  return dbUser?.currency ?? "EUR";
});
