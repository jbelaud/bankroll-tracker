import "server-only";

import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

export const requireUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Non authentifié");
  }

  if (!user.email) {
    throw new Error("Le compte authentifié ne possède pas d'adresse e-mail");
  }

  const existingProfile = await prisma.user.findUnique({
    where: { id: user.id },
    select: { email: true },
  });

  if (!existingProfile) {
    const betaProgram = await prisma.betaProgram.findUnique({
      where: { id: "global" },
      select: { phase: true },
    });

    await prisma.user.upsert({
      where: { id: user.id },
      update: { email: user.email },
      create: {
        id: user.id,
        email: user.email,
        name:
          typeof user.user_metadata?.full_name === "string"
            ? user.user_metadata.full_name
            : null,
        plan: betaProgram?.phase === "ACTIVE" ? "BETA_TESTER" : "FREE",
        referralCode: user.id.replaceAll("-", "").toUpperCase(),
      },
    });
  } else if (existingProfile.email !== user.email) {
    await prisma.user.update({
      where: { id: user.id },
      data: { email: user.email },
    });
  }

  return user;
});
