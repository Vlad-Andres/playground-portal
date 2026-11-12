import { notFound } from "next/navigation";
import { estimateCost, overview } from "@/lib/admin/overview";
import { adminConfigured, getAdminSession } from "@/lib/admin/session";
import { dailyJobLimit } from "@/lib/guard";
import { defaultStore } from "@/lib/jobs/store";
import { readSettings } from "@/lib/settings";
import { logout } from "./actions";
import { CourseTable } from "./CourseTable";
import { InviteCodes } from "./InviteCodes";
import { LoginForm } from "./LoginForm";
import { SettingsForm } from "./SettingsForm";
import styles from "./admin.module.css";

export const metadata = { title: "Admin · playground.", robots: { index: false, follow: false } };

function formatUsd(usd: number): string {
  return `$${usd.toFixed(4)}`;
}

function formatTokens(usage: { inputTokens: number; outputTokens: number }): string {
  return (usage.inputTokens + usage.outputTokens).toLocaleString("en-US");
}

function formatStamp(iso: string): string {
  return iso.replace("T", " ").slice(0, 16);
}

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

  const store = defaultStore();
  const [settings, data] = await Promise.all([readSettings(store), overview(store, new Date())]);
  const limit = settings.dailyJobLimit ?? dailyJobLimit(process.env);
  const codeLabels = new Map(settings.codes.map((code) => [code.id, code.label]));

  const courseRows = data.courses.map(({ key, meta }) => ({
    key,
    title: meta.title,
    lectures: meta.lectures,
    published: formatStamp(meta.publishedAt),
    tokens: formatTokens(meta.usage),
    cost: formatUsd(estimateCost(meta.usage)),
  }));

  function codeLabel(codeId: string | undefined): string {
    if (!codeId) return "—";
    if (codeId === "env") return "PORTAL_ACCESS_CODE";
    return codeLabels.get(codeId) ?? `deleted (${codeId})`;
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Admin</h1>
        <a className={styles.backLink} href="/admin/translations">Edit translations →</a>
        <form action={logout}>
          <button type="submit" className={styles.ghost}>Log out</button>
        </form>
      </header>

      <h2 className={styles.section}>Today</h2>
      <div className={styles.stats}>
        <div className={styles.stat}>
          <span>Jobs today</span>
          <strong>{data.jobsToday} / {limit}</strong>
        </div>
        <div className={styles.stat}>
          <span>Courses</span>
          <strong>{data.totals.courses.toLocaleString("en-US")}</strong>
        </div>
        <div className={styles.stat}>
          <span>Tokens (published courses)</span>
          <strong>
            {formatTokens(data.totals)}
            <small> ({data.totals.inputTokens.toLocaleString("en-US")} in · {data.totals.outputTokens.toLocaleString("en-US")} out)</small>
          </strong>
        </div>
        <div className={styles.stat}>
          <span>Estimated cost</span>
          <strong>{formatUsd(data.totals.costUsd)} <small>(estimate)</small></strong>
        </div>
      </div>

      <h2 className={styles.section}>Settings</h2>
      <SettingsForm settings={settings} />

      <h2 className={styles.section}>Invite codes</h2>
      <InviteCodes codes={settings.codes} />

      <h2 className={styles.section}>Courses</h2>
      <CourseTable rows={courseRows} />

      <h2 className={styles.section}>Recent jobs</h2>
      {data.jobs.length === 0 ? (
        <div className={styles.card}>No jobs yet.</div>
      ) : (
        <div className={styles.card}>
          <div className={styles.scroll}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Created</th>
                  <th>Status</th>
                  <th>Step</th>
                  <th>Lectures</th>
                  <th>Invite code</th>
                  <th>Tokens</th>
                  <th>Cost (estimate)</th>
                  <th>Error</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {data.jobs.map((job) => (
                  <tr key={job.id}>
                    <td>{formatStamp(job.createdAt)}</td>
                    <td>{job.status}</td>
                    <td><code>{job.step}</code></td>
                    <td>{job.lecturesDone} / {job.lecturesTotal}</td>
                    <td>{codeLabel(job.codeId)}</td>
                    <td>{formatTokens(job.usage)}</td>
                    <td>{formatUsd(estimateCost(job.usage))}</td>
                    <td>{job.error ? <code>{job.error}</code> : "—"}</td>
                    <td className={styles.actions}>
                      {job.status === "done" && job.siteUrl ? (
                        <a href={job.siteUrl} target="_blank" rel="noreferrer">Open</a>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </main>
  );
}
