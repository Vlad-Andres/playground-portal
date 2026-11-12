import { notFound, redirect } from "next/navigation";
import { adminConfigured, getAdminSession } from "@/lib/admin/session";
import { defaultStore } from "@/lib/jobs/store";
import { DEFAULT_MESSAGES, flattenMessages, readOverrides } from "@/lib/translations";
import styles from "../admin.module.css";
import { TranslationEditor, type TranslationRow } from "./TranslationEditor";

export const metadata = { title: "Translations · Admin · playground.", robots: { index: false, follow: false } };

export default async function TranslationsPage() {
  if (!adminConfigured(process.env)) notFound();
  if ((await getAdminSession()).admin !== true) redirect("/admin");

  const overrides = await readOverrides(defaultStore());
  const en = flattenMessages(DEFAULT_MESSAGES.en);
  const ro = flattenMessages(DEFAULT_MESSAGES.ro);
  const rows: TranslationRow[] = Object.keys(en).map((key) => ({
    key,
    defaults: { en: en[key], ro: ro[key] ?? "" },
    overrides: { en: overrides.en[key] ?? null, ro: overrides.ro[key] ?? null },
  }));

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Translations</h1>
        <a className={styles.backLink} href="/admin">← Admin</a>
      </header>
      <p className={styles.note}>
        Every text of the portal (not the course pages) in English and Romanian. Changed texts are live on the next
        page load; &quot;Reset&quot; returns to the shipped text. Keep placeholders such as <code>{"{max}"}</code> and tags
        such as <code>{"<em>…</em>"}</code> exactly; a change that breaks them is refused.
      </p>
      <TranslationEditor rows={rows} />
    </main>
  );
}
