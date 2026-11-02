import { NextResponse } from "next/server";
import { adminApiDenial } from "@/lib/admin-api";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const denial = await adminApiDenial();
  if (denial) return denial;
  const count = await prisma.partnerReferralClaim.count({ where: { status: "PENDING" } });
  return NextResponse.json({ count }, { headers: { "Cache-Control": "private, no-store" } });
}
