import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Editor } from "@/components/manage/Editor";
import { TopBar } from "@/components/TopBar";
import { defaultStore } from "@/lib/jobs/store";
import { editorModel } from "@/lib/sites/editor-model";
import { findCourseByOwnerToken, readSite } from "@/lib/sites/store";
import styles from "../manage.module.css";

export const metadata = { robots: { index: false, follow: false } };

export default async function ManagePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const store = defaultStore();
  // A wrong or guessed link looks exactly like a page that does not exist.
  const key = await findCourseByOwnerToken(store, token);
  if (key === null) notFound();
  // Read fresh: the cached loader would show the version from before the last edit.
  const site = await readSite(store, key);
  if (!site) notFound();
  const t = await getTranslations("manage");

  return (
    <main className={styles.page}>
      <TopBar />
      <h1 className={styles.title}>{t("title")}</h1>
      <p className={styles.lead}>{t("lead")}</p>
      <Editor token={token} model={editorModel(site)} />
    </main>
  );
}
