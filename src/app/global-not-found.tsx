import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export const metadata: Metadata = {
  title: "404 — BetTrack",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function GlobalNotFound() {
  const requestHeaders = await headers();
  const isEnglish = requestHeaders.get("x-next-intl-locale") === "en";
  const title = isEnglish ? "This page could not be found." : "Cette page est introuvable.";
  const description = isEnglish
    ? "It may have moved or the address may be incomplete."
    : "Elle a peut-être été déplacée ou l’adresse est incomplète.";
  const homeLabel = isEnglish ? "Back to BetTrack" : "Retour à BetTrack";
  const homeHref = isEnglish ? "/en" : "/fr";

  return (
    <html lang={isEnglish ? "en" : "fr"} className="dark">
      <body className="min-h-screen bg-background text-foreground">
        <main className="marketing-section">
          <div className="marketing-container max-w-2xl text-center">
            <p className="marketing-eyebrow justify-center">404</p>
            <h1 className="mt-4 text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">{title}</h1>
            <p className="mt-5 text-muted-foreground">{description}</p>
            <a href={homeHref} className="marketing-primary-cta mt-8">{homeLabel}</a>
          </div>
        </main>
      </body>
    </html>
  );
}
