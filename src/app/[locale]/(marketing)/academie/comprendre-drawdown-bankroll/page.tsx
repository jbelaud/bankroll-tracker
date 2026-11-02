import type { Metadata } from "next";
import type { Locale } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import content from "@/lib/academy-drawdown-content.json";
import { AcademyLearningArticle } from "@/components/academy-learning-article";
import { marketingMetadata } from "@/lib/marketing-seo";
type Props = { params: Promise<{ locale: Locale }> };
const path = "/academie/comprendre-drawdown-bankroll";
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const { title, description } = content[locale];
  return marketingMetadata({ locale, path, title, description });
}
export default async function DrawdownArticle({ params }: Props) {
  const { locale } = await params;
  return <>
    <AcademyLearningArticle locale={locale} path={path} copy={content[locale]} />
    <nav aria-label={locale === "fr" ? "Lectures complémentaires" : "Related reading"} className="kalivoa-content-frame pb-12">
      <h2 className="text-xl font-semibold">{locale === "fr" ? "Comprendre les autres indicateurs" : "Understand related metrics"}</h2>
      <ul className="mt-4 space-y-3 text-sm font-semibold text-primary">
        <li><Link href="/academie/calculer-roi-paris" locale={locale} className="hover:underline">{locale === "fr" ? "Calculer le ROI et le taux de réussite" : "Calculate ROI and win rate"}</Link></li>
        <li><Link href="/academie/comprendre-unites-bankroll" locale={locale} className="hover:underline">{locale === "fr" ? "Comprendre les mises en unités" : "Understand stakes in units"}</Link></li>
      </ul>
    </nav>
  </>;
}
