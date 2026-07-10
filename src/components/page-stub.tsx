import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";

export async function PageStub({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  const t = await getTranslations("common");
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">{title}</h1>
      <div className="glass-card rounded-xl p-6 text-center text-sm text-muted-foreground">
        {t("comingSoon")}
      </div>
      {children}
    </div>
  );
}
