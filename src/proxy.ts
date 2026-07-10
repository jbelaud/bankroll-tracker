import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "@/i18n/routing";

const PROTECTED_ROUTES = [
  "/dashboard",
  "/bankrolls",
  "/scan",
  "/stats",
  "/account",
  "/history",
];
const AUTH_ROUTES = ["/login", "/signup"];

const handleI18nRouting = createMiddleware(routing);

// Retire le préfixe /fr ou /en du pathname pour retrouver la route "logique"
// (celle que PROTECTED_ROUTES/AUTH_ROUTES connaissent, inchangée par l'i18n).
function stripLocale(pathname: string): string {
  const match = pathname.match(/^\/(fr|en)(?=\/|$)/);
  return match ? pathname.slice(match[0].length) || "/" : pathname;
}

function detectLocale(pathname: string): string {
  return pathname.match(/^\/(fr|en)(?=\/|$)/)?.[1] ?? routing.defaultLocale;
}

export async function proxy(request: NextRequest) {
  // next-intl d'abord : résout/ajoute le préfixe de locale. Une redirection
  // ici (préfixe manquant ou à corriger) est renvoyée telle quelle — l'auth
  // sera vérifiée au prochain passage, une fois l'URL correctement préfixée.
  const response = handleI18nRouting(request);
  if (response.headers.get("location")) {
    return response;
  }

  // On mute la MÊME réponse (pas de NextResponse.next({request}) concurrente)
  // pour ne pas perdre les en-têtes déjà posés par next-intl (cookie de
  // locale, Link d'alternates) — on y ajoute juste les cookies de session.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = stripLocale(request.nextUrl.pathname);
  const locale = detectLocale(request.nextUrl.pathname);

  const isProtectedRoute = PROTECTED_ROUTES.some((route) =>
    pathname.startsWith(route)
  );
  const isAuthRoute = AUTH_ROUTES.some((route) => pathname.startsWith(route));

  if (isProtectedRoute && !user) {
    return NextResponse.redirect(new URL(`/${locale}/login`, request.url));
  }

  if (isAuthRoute && user) {
    return NextResponse.redirect(new URL(`/${locale}/dashboard`, request.url));
  }

  return response;
}

export const config = {
  // /api et /auth restent hors i18n (route API + callback OAuth fixe) —
  // next-intl ne doit jamais essayer de les préfixer.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api|auth).*)"],
};
