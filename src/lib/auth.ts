import "server-only";

import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { createWelcomeProfile } from "@/lib/billing/welcome-enrollment";
import { commercialRecordsEnabled } from "@/lib/billing/commercial-config";

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
    await createWelcomeProfile({
      id: user.id,
      email: user.email,
      name: typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : null,
    });
  } else if (existingProfile.email !== user.email) {
    await prisma.user.update({
      where: { id: user.id },
      data: { email: user.email },
    });
  }

  if (commercialRecordsEnabled()) {
    const now = new Date();
    await prisma.user.updateMany({ where: { id: user.id, lastActiveAt: { lt: new Date(now.getTime() - 86_400_000) } }, data: { lastActiveAt: now, inactivityNoticeAt: null } });
  }
  return user;
});
