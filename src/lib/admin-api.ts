import "server-only";

import { NextResponse } from "next/server";
import { checkAdminAccess } from "@/lib/admin";

export async function adminApiDenial(): Promise<NextResponse | null> {
  const access = await checkAdminAccess();
  if (access.status === "allowed") return null;
  const status = access.status === "unauthenticated" ? 401 : access.status === "unavailable" ? 503 : 403;
  return NextResponse.json({ error: access.status }, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
}
