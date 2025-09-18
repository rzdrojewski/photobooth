import { getTranslations } from "next-intl/server";

export default async function CountdownSettingsPage() {
  const t = await getTranslations("configCountdown");
  return (
    <div className="rounded-lg border border-dashed border-black/10 p-6 text-sm dark:border-white/20">
      {t("placeholder")}
    </div>
  );
}
