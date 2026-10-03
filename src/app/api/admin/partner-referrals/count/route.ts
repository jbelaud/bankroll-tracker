import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export async function GET() {
  await requireAdmin();
  const count = await prisma.partnerReferralClaim.count({ where: { status: "PENDING" } });
  return NextResponse.json({ count }, { headers: { "Cache-Control": "private, no-store" } });
}
