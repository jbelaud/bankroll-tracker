import type { Metadata } from "next";
import type { Locale } from "@/i18n/routing";
import content from "@/lib/academy-sport-content.json";
import { AcademyLearningArticle } from "@/components/academy-learning-article";
import { marketingMetadata } from "@/lib/marketing-seo";

type Props = { params: Promise<{ locale: Locale }> };
const path = "/academie/analyser-resultats-par-sport";
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const { title, description } = content[locale];
  return marketingMetadata({ locale, path, title, description });
}
export default async function SportResultsArticle({ params }: Props) {
  const { locale } = await params;
  const article = content[locale];
  return <AcademyLearningArticle locale={locale} path={path} publishedAt="2026-11-02" copy={{
    ...article,
    category: locale === "fr" ? "Comprendre ses statistiques" : "Understand your statistics",
    proof: {
      src: "/images/academie/relecture-ticket-pari-kalivoa.png",
      alt: locale === "fr" ? "Relecture Kalivoa : deux paris perdus, tennis 10 € et cyclisme 7,50 €." : "Kalivoa review: two lost bets, €10 tennis and €7.50 cycling.",
      caption: article.caption,
    },
    related: article.related.filter(([, href]) => !href.endsWith("/bankroll-tracking")).map(([title, href]) => ({ title, path: href.replace(/^\/(fr|en)/, "") })),
  }} />;
}
