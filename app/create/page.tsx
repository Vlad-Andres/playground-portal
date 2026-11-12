import { getLocale, getTranslations } from "next-intl/server";
import { Builder } from "@/components/create/Builder";
import { TopBar } from "@/components/TopBar";
import { defaultStore } from "@/lib/jobs/store";
import { readSettings } from "@/lib/settings";

export default async function CreatePage() {
  const t = await getTranslations("create");
  const locale = await getLocale();
  const settings = await readSettings(defaultStore());
  const announcement = (locale === "ro" ? settings.announcement.ro : settings.announcement.en).trim();
  return (
    <main>
      <TopBar note={t("topbarNote")} />
      <Builder announcement={announcement || undefined} />
    </main>
  );
}
