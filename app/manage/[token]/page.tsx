import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Editor } from "@/components/manage/Editor";
import { TopBar } from "@/components/TopBar";
import { defaultStore } from "@/lib/jobs/store";
import { editorModel } from "@/lib/sites/editor-model";
import { findCourseByOwnerToken, readMeta, readSite } from "@/lib/sites/store";
import { accountsConfigured } from "@/lib/auth/config";
import { currentUser } from "@/lib/auth/session";
import { ClaimBox } from "@/components/manage/ClaimBox";
import { Versions } from "@/components/course/Versions";
import { listVersions } from "@/lib/sites/library";
import { removeCourse, restore, saveCourse } from "./actions";
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
  const meta = await readMeta(store, key);
  const showClaim = accountsConfigured(process.env) && meta !== null && meta.ownerId === "";
  const signedIn = showClaim ? (await currentUser()) !== null : false;

  return (
    <main className={styles.page}>
      <TopBar />
      <h1 className={styles.title}>{t("title")}</h1>
      <p className={styles.lead}>{t("lead")}</p>
      {showClaim ? <ClaimBox token={token} signedIn={signedIn} /> : null}
      <Editor model={editorModel(site)} save={saveCourse.bind(null, token)} remove={removeCourse.bind(null, token)} />
      <Versions versions={await listVersions(store, key)} restore={restore.bind(null, token)} />
    </main>
  );
}
