import { getTranslations } from "next-intl/server";
import { listTipsters } from "@/lib/actions/tipsters";
import { TipsterManager } from "@/components/tipsters/tipster-manager";

export default async function TipstersPage() {
  const [tipsters, t] = await Promise.all([
    listTipsters({ includeArchived: true }),
    getTranslations("tipsters"),
  ]);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-semibold">{t("title")}</h1>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">{t("description")}</p>
      </div>
      <TipsterManager
        initialTipsters={tipsters.map(({ id, name, platform, notes, status, betCount }) => ({
          id,
          name,
          platform,
          notes,
          status,
          betCount,
        }))}
      />
    </div>
  );
}
