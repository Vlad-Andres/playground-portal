import { getTranslations } from "next-intl/server";
import { Builder } from "@/components/create/Builder";
import { TopBar } from "@/components/TopBar";

export default async function CreatePage() {
  const t = await getTranslations("create");
  return (
    <main>
      <TopBar note={t("topbarNote")} />
      <Builder />
    </main>
  );
}
