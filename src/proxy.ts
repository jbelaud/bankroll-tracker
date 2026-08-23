import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "@/i18n/routing";

const PROTECTED_ROUTES = [
  "/dashboard",
  "/bankrolls",
  "/scan",
  "/stats",
  "/account",
  "/history",
  "/referrals",
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
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const isDev = process.env.NODE_ENV !== "production";
  // L'app ne parle qu'à son propre projet Supabase. Ne pas autoriser tous les
  // sous-domaines *.supabase.co : une CSP doit rester aussi précise que possible.
  const supabaseOrigin = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).origin;
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    `connect-src 'self' ${supabaseOrigin}`,
    "media-src 'self'",
    "worker-src 'self' blob:",
    "frame-src 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    isDev ? "" : "upgrade-insecure-requests",
  ]
    .filter(Boolean)
    .join("; ");
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);
  request = new NextRequest(request, { headers: requestHeaders });

  // next-intl d'abord : résout/ajoute le préfixe de locale. Une redirection
  // ici (préfixe manquant ou à corriger) est renvoyée telle quelle — l'auth
  // sera vérifiée au prochain passage, une fois l'URL correctement préfixée.
  const response = handleI18nRouting(request);
  if (response.headers.get("location")) {
    response.headers.set("Content-Security-Policy", csp);
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
    const redirectResponse = NextResponse.redirect(new URL(`/${locale}/login`, request.url));
    redirectResponse.headers.set("Content-Security-Policy", csp);
    return redirectResponse;
  }

  if (isAuthRoute && user) {
    const redirectResponse = NextResponse.redirect(new URL(`/${locale}/dashboard`, request.url));
    redirectResponse.headers.set("Content-Security-Policy", csp);
    return redirectResponse;
  }

  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  // /api et /auth restent hors i18n (route API + callback OAuth fixe) —
  // next-intl ne doit jamais essayer de les préfixer. Les fichiers SEO
  // racine restent eux aussi sans locale pour respecter leurs conventions.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api|auth|robots.txt|sitemap.xml|llms.txt|manifest.webmanifest).*)"],
};
