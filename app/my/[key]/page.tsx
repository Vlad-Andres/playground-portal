import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { AddMaterial } from "@/components/course/AddMaterial";
import { KeptFiles } from "@/components/course/KeptFiles";
import { Refine } from "@/components/course/Refine";
import { Versions } from "@/components/course/Versions";
import { Editor } from "@/components/manage/Editor";
import { TopBar } from "@/components/TopBar";
import { accountsConfigured } from "@/lib/auth/config";
import { currentUser } from "@/lib/auth/session";
import { defaultStore } from "@/lib/jobs/store";
import { editorModel } from "@/lib/sites/editor-model";
import { listVersions, resolveAccess, ROUNDS_MAX, roundsUsed, sourceUsage } from "@/lib/sites/library";
import { readSite } from "@/lib/sites/store";
import styles from "../../manage/manage.module.css";
import { removeMyCourse, restoreMyVersion, saveMyCourse, setKeep } from "./actions";

export const metadata = { robots: { index: false, follow: false } };

export default async function MyCoursePage({ params }: { params: Promise<{ key: string }> }) {
  if (!accountsConfigured(process.env)) notFound();
  const { key } = await params;
  const user = await currentUser();
  if (!user) redirect(`/api/auth/google?next=/my/${encodeURIComponent(key)}`);
  const store = defaultStore();
  const access = await resolveAccess(store, { uid: user.uid, key });
  if (!access) notFound();
  const site = await readSite(store, access.key);
  if (!site) notFound();
  const t = await getTranslations("manage");
  const [versions, used, usage] = await Promise.all([listVersions(store, access.key), roundsUsed(store, access.key), sourceUsage(store, access.key)]);

  return (
    <main className={styles.page}>
      <TopBar />
      <h1 className={styles.title}>{site.course.title}</h1>
      <p className={styles.lead}>{t("lead")}</p>
      <Refine courseKey={access.key} roundsLeft={Math.max(0, ROUNDS_MAX - used)} />
      <AddMaterial courseKey={access.key} />
      <Editor model={editorModel(site)} save={saveMyCourse.bind(null, access.key)} remove={removeMyCourse.bind(null, access.key)} />
      <Versions versions={versions} restore={restoreMyVersion.bind(null, access.key)} />
      <KeptFiles kept={access.meta.keepSources} files={usage.files} bytes={usage.bytes} setKeep={setKeep.bind(null, access.key)} />
    </main>
  );
}
