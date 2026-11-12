import { notFound } from "next/navigation";
import { adminConfigured, getAdminSession } from "@/lib/admin/session";
import { logout } from "./actions";
import { LoginForm } from "./LoginForm";
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

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Admin</h1>
        <form action={logout}>
          <button type="submit" className={styles.ghost}>Log out</button>
        </form>
      </header>
    </main>
  );
}
