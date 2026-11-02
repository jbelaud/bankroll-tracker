import type { Metadata } from "next";
import type { Locale } from "@/i18n/routing";
import content from "@/lib/academy-roi-content.json";
import { AcademyLearningArticle } from "@/components/academy-learning-article";
import { marketingMetadata } from "@/lib/marketing-seo";

type Props = { params: Promise<{ locale: Locale }> };
const path = "/academie/calculer-roi-paris";
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const { title, description } = content[locale];
  return marketingMetadata({ locale, path, title, description });
}
export default async function RoiArticle({ params }: Props) {
  const { locale } = await params;
  return <AcademyLearningArticle locale={locale} path={path} copy={content[locale]} />;
}
