import type { Metadata } from "next";
import type { Locale } from "@/i18n/routing";
import { getSiteUrl, getSiteUrlForPath } from "@/lib/site";

const ogLocale: Record<Locale, string> = {
  fr: "fr_FR",
  en: "en_US",
};

export function localizedPublicPath(locale: Locale, path = ""): string {
  return "/" + locale + path;
}

export function publicAlternates(locale: Locale, path = ""): Metadata["alternates"] {
  return {
    canonical: localizedPublicPath(locale, path),
    languages: {
      fr: localizedPublicPath("fr", path),
      en: localizedPublicPath("en", path),
      "x-default": localizedPublicPath("fr", path),
    },
  };
}

export function marketingMetadata({
  locale,
  path = "",
  title,
  description,
}: {
  locale: Locale;
  path?: string;
  title: string;
  description: string;
}): Metadata {
  const localizedPath = localizedPublicPath(locale, path);

  return {
    title,
    description,
    alternates: publicAlternates(locale, path),
    openGraph: {
      type: "website",
      locale: ogLocale[locale],
      url: getSiteUrlForPath(localizedPath),
      siteName: "Kalivoa",
      title,
      description,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export const siteMetadataBase = new URL(getSiteUrl());
