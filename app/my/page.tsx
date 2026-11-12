import { notFound, redirect } from "next/navigation";
import { getFormatter, getTranslations } from "next-intl/server";
import { TopBar } from "@/components/TopBar";
import { accountsConfigured } from "@/lib/auth/config";
import { currentUser } from "@/lib/auth/session";
import { defaultStore } from "@/lib/jobs/store";
import { listUserCourses } from "@/lib/sites/library";
import { DeleteAccount } from "./DeleteAccount";
import styles from "./my.module.css";

export const metadata = { robots: { index: false, follow: false } };

export default async function MyCoursesPage() {
  if (!accountsConfigured(process.env)) notFound();
  const user = await currentUser();
  if (!user) redirect("/api/auth/google?next=/my");
  const t = await getTranslations("my");
  const format = await getFormatter();
  const courses = await listUserCourses(defaultStore(), user.uid);

  return (
    <main className={styles.page}>
      <TopBar />
      <h1 className={styles.title}>{t("title")}</h1>
      {courses.length === 0 ? (
        <div className={styles.empty}>
          <p>{t("empty")}</p>
          <a className="primary-button" href="/create" style={{ width: "auto" }}>{t("create")}</a>
        </div>
      ) : (
        <ul className={styles.list}>
          {courses.map(({ key, meta }) => (
            <li key={key} className={styles.item}>
              <div>
                <h2>{meta.title || key}</h2>
                <small>{t("details", { lectures: meta.lectures, date: format.dateTime(new Date(meta.updatedAt), { dateStyle: "medium" }) })}</small>
              </div>
              <span className={styles.links}>
                <a href={`/courses/${key}/`} target="_blank" rel="noreferrer">{t("open")}</a>
                <a href={`/my/${key}`}>{t("manage")}</a>
              </span>
            </li>
          ))}
        </ul>
      )}
      <DeleteAccount />
    </main>
  );
}
