import { getTranslations } from "next-intl/server";
import { PageStub } from "@/components/page-stub";

export default async function ManualEntryPage() {
  const t = await getTranslations("common");
  return <PageStub title={t("manualEntryTitle")} />;
}
