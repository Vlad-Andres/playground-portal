import { notFound } from "next/navigation";
import { adminConfigured, getAdminSession } from "@/lib/admin/session";
import { defaultStore } from "@/lib/jobs/store";
import { readSettings } from "@/lib/settings";
import { logout } from "./actions";
import { InviteCodes } from "./InviteCodes";
import { LoginForm } from "./LoginForm";
import { SettingsForm } from "./SettingsForm";
import styles from "./admin.module.css";

export const metadata = { title: "Admin · playground.", robots: { index: false, follow: false } };

export default async function AdminPage() {
  if (!adminConfigured(process.env)) notFound();
  const session = await getAdminSession();

  if (session.admin !== true) {
    return (
      <main className={styles.page}>
        <h1 className={styles.title}>Admin</h1>
        <LoginForm />
      </main>
    );
  }

  const settings = await readSettings(defaultStore());

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Admin</h1>
        <form action={logout}>
          <button type="submit" className={styles.ghost}>Log out</button>
        </form>
      </header>

      <h2 className={styles.section}>Settings</h2>
      <SettingsForm settings={settings} />

      <h2 className={styles.section}>Invite codes</h2>
      <InviteCodes codes={settings.codes} />
    </main>
  );
}
