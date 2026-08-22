import type { MetadataRoute } from "next";
import { getSiteUrlForPath, isProductionDeployment } from "@/lib/site";

const privatePaths = [
  "/api/",
  "/auth/",
  "/fr/dashboard",
  "/en/dashboard",
  "/fr/bankrolls",
  "/en/bankrolls",
  "/fr/scan",
  "/en/scan",
  "/fr/stats",
  "/en/stats",
  "/fr/account",
  "/en/account",
  "/fr/history",
  "/en/history",
  "/fr/admin",
  "/en/admin",
];

export default function robots(): MetadataRoute.Robots {
  const production = isProductionDeployment();
  const privateRules = production ? privatePaths : ["/"];

  return {
    rules: [
      {
        userAgent: "OAI-SearchBot",
        allow: production ? "/" : undefined,
        disallow: privateRules,
      },
      {
        userAgent: "GPTBot",
        disallow: "/",
      },
      {
        userAgent: "*",
        allow: production ? "/" : undefined,
        disallow: privateRules,
      },
    ],
    sitemap: getSiteUrlForPath("/sitemap.xml"),
  };
}
