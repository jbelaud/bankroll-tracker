import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const PUBLIC_CODE_PATTERN = /^[A-Za-z0-9_-]{16,40}$/;

export async function GET(request: Request, context: { params: Promise<{ code: string }> }) {
  const { code } = await context.params;
  const destination = new URL("/fr/signup", request.url);

  // Un code inconnu reçoit le même écran d'inscription : la validité du lien
  // est contrôlée au moment de l'inscription, sans servir d'oracle public.
  if (!PUBLIC_CODE_PATTERN.test(code)) return NextResponse.redirect(destination);

  destination.searchParams.set("invite", code);
  const invite = await prisma.betaInvite.findUnique({
    where: { publicCode: code },
    select: { utmSource: true, utmMedium: true, utmCampaign: true },
  });
  if (invite?.utmSource) destination.searchParams.set("utm_source", invite.utmSource);
  if (invite?.utmMedium) destination.searchParams.set("utm_medium", invite.utmMedium);
  if (invite?.utmCampaign) destination.searchParams.set("utm_campaign", invite.utmCampaign);

  return NextResponse.redirect(destination);
}
