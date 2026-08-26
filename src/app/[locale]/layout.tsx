import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { notFound } from "next/navigation";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import "../globals.css";
import { cn } from "@/lib/utils";
import { routing } from "@/i18n/routing";
import { siteMetadataBase } from "@/lib/marketing-seo";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
});

export const metadata: Metadata = {
  metadataBase: siteMetadataBase,
  applicationName: "Kalivoa",
  title: {
    default: "Kalivoa",
    template: "%s | Kalivoa",
  },
  description: "Sports-betting bankroll tracking",
  icons: {
    icon: "/kalivoa-icon.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#0b0d12",
  viewportFit: "cover",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  setRequestLocale(locale);

  return (
    <html
      lang={locale}
      className={cn(
        "dark h-full antialiased",
        inter.variable,
        jetbrainsMono.variable
      )}
    >
      <body className="min-h-full flex flex-col">
        <NextIntlClientProvider>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
