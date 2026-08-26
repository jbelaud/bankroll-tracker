import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isPublicGrowthEventName, recordGrowthEventSafely } from "@/lib/growth/events";

function isSameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (!origin || !host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Origine interdite." }, { status: 403 });
  const body = await request.json().catch(() => null);
  if (!body || !isPublicGrowthEventName(body.name) || typeof body.anonymousId !== "string") {
    return NextResponse.json({ error: "Événement invalide." }, { status: 400 });
  }

  // L'identité vient exclusivement de la session serveur. L'identifiant
  // anonyme reste utile avant l'inscription, tandis que les événements après
  // connexion peuvent rejoindre le funnel utilisateur sans faire confiance
  // à une valeur envoyée par le navigateur.
  let userId: string | null = null;
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    userId = user?.id ?? null;
  } catch {
    // L'analytics ne doit jamais empêcher le parcours produit.
  }

  await recordGrowthEventSafely({
    name: body.name,
    userId,
    anonymousId: body.anonymousId,
    properties: body.properties && typeof body.properties === "object" && !Array.isArray(body.properties)
      ? body.properties
      : undefined,
  });
  return new NextResponse(null, { status: 204 });
}
