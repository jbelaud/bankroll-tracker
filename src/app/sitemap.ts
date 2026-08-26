import type { MetadataRoute } from "next";
import { getSiteUrlForPath, isProductionDeployment } from "@/lib/site";

const publicPaths = [
  { path: "", priority: 1, changeFrequency: "weekly" as const },
  { path: "/features", priority: 0.8, changeFrequency: "monthly" as const },
  { path: "/screenshot-import", priority: 0.8, changeFrequency: "monthly" as const },
  { path: "/bankroll-tracking", priority: 0.7, changeFrequency: "monthly" as const },
  { path: "/bookmakers", priority: 0.7, changeFrequency: "monthly" as const },
  { path: "/bookmakers/unibet", priority: 0.7, changeFrequency: "monthly" as const },
  { path: "/bookmakers/betclic", priority: 0.7, changeFrequency: "monthly" as const },
  { path: "/bookmakers/winamax", priority: 0.7, changeFrequency: "monthly" as const },
  { path: "/pricing", priority: 0.6, changeFrequency: "monthly" as const },
  { path: "/faq", priority: 0.6, changeFrequency: "monthly" as const },
  { path: "/privacy", priority: 0.3, changeFrequency: "yearly" as const },
  { path: "/terms", priority: 0.3, changeFrequency: "yearly" as const },
  { path: "/responsible-gambling", priority: 0.4, changeFrequency: "yearly" as const },
];

export default function sitemap(): MetadataRoute.Sitemap {
  if (!isProductionDeployment()) return [];

  return publicPaths.flatMap((item) => {
    const frenchPath = "/fr" + item.path;
    const englishPath = "/en" + item.path;
    const alternates = {
      languages: {
        fr: getSiteUrlForPath(frenchPath),
        en: getSiteUrlForPath(englishPath),
        "x-default": getSiteUrlForPath(frenchPath),
      },
    };

    return [
      {
        url: getSiteUrlForPath(frenchPath),
        changeFrequency: item.changeFrequency,
        priority: item.priority,
        alternates,
      },
      {
        url: getSiteUrlForPath(englishPath),
        changeFrequency: item.changeFrequency,
        priority: item.priority,
        alternates,
      },
    ];
  });
}
