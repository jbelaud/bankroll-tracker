import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

// CSP différenciée dev/prod : Turbopack a besoin de 'unsafe-eval' pour le
// HMR en développement, jamais en production. style-src reste en
// 'unsafe-inline' dans les deux cas — Base UI (floating-ui) positionne ses
// popovers/drawers via des styles inline générés en JS, les bloquer casse
// visuellement les menus/select/drawer partout dans l'app.
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig: NextConfig = {
  experimental: {
    globalNotFound: true,
  },
  async redirects() {
    return [
      {
        source: "/favicon.ico",
        destination: "/kalivoa-icon.svg",
        permanent: true,
      },
    ];
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

export default withNextIntl(nextConfig);
