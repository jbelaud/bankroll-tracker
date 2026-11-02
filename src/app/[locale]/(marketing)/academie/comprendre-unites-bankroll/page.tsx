import type { Metadata } from "next";
import type { Locale } from "@/i18n/routing";
import content from "@/lib/academy-units-content.json";
import { AcademyLearningArticle } from "@/components/academy-learning-article";
import { marketingMetadata } from "@/lib/marketing-seo";

type Props = { params: Promise<{ locale: Locale }> };
const path = "/academie/comprendre-unites-bankroll";
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const { title, description } = content[locale];
  return marketingMetadata({ locale, path, title, description });
}
export default async function UnitsArticle({ params }: Props) {
  const { locale } = await params;
  return <AcademyLearningArticle locale={locale} path={path} copy={content[locale]} />;
}
