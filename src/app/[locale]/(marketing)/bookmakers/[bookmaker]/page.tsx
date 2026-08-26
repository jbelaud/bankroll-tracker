import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { Locale } from "@/i18n/routing";
import { BookmakerSeoPage } from "@/components/marketing/bookmaker-seo-page";
import { marketingMetadata } from "@/lib/marketing-seo";
import {
  getPublicBookmakerSupportStatus,
  priorityMarketingBookmaker,
} from "@/lib/marketing-bookmakers";

type Props = { params: Promise<{ locale: Locale; bookmaker: string }> };

function pageCopy(locale: Locale, bookmaker: string) {
  if (locale === "en") {
    return {
      title: `Track ${bookmaker} bets from a screenshot`,
      description: `Use Kalivoa Scan to prepare the tracking of your ${bookmaker} bets from a screenshot, then review every detail before import.`,
    };
  }
  return {
    title: `Suivre ses paris ${bookmaker} depuis une capture`,
    description: `Utilisez Kalivoa Scan pour préparer le suivi de vos paris ${bookmaker} depuis une capture, puis vérifiez chaque détail avant l’import.`,
  };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, bookmaker: slug } = await params;
  const bookmaker = priorityMarketingBookmaker(slug);
  if (!bookmaker) return {};
  const copy = pageCopy(locale, bookmaker.bookmaker);
  return marketingMetadata({
    locale,
    path: `/bookmakers/${bookmaker.slug}`,
    title: copy.title,
    description: copy.description,
  });
}

export default async function BookmakerPage({ params }: Props) {
  const { locale, bookmaker: slug } = await params;
  const bookmaker = priorityMarketingBookmaker(slug);
  if (!bookmaker) notFound();
  const supportStatus = await getPublicBookmakerSupportStatus(bookmaker.bookmaker);
  return <BookmakerSeoPage locale={locale} bookmaker={bookmaker.bookmaker} supportStatus={supportStatus} />;
}
