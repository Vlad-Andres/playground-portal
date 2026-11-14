"use client";

import { useState } from "react";
import type { Report } from "@/lib/reports";
import { deleteCourse, dismissReport } from "./actions";
import styles from "./admin.module.css";

const CATEGORY: Record<Report["category"], string> = { "wrong-content": "Wrong content", copyright: "Copyright", other: "Other" };

/** Open reports: dismiss one, or take its course down (which also closes the report). */
export function ReportQueue({ reports }: { reports: Report[] }) {
  const [error, setError] = useState("");
  if (reports.length === 0) return <div className={styles.card}>No open reports.</div>;
  return (
    <div className={styles.card}>
      {error ? <p className={styles.error} role="alert">{error}</p> : null}
      <div className={styles.scroll}>
        <table className={styles.table}>
          <thead>
            <tr><th>When</th><th>Course</th><th>Kind</th><th>Message</th><th>Reply to</th><th /></tr>
          </thead>
          <tbody>
            {reports.map((report) => (
              <tr key={report.id}>
                <td>{report.createdAt.slice(0, 16).replace("T", " ")}</td>
                <td><a href={`/courses/${report.courseKey}/`} target="_blank" rel="noreferrer">{report.courseKey}</a></td>
                <td>{CATEGORY[report.category]}</td>
                <td>{report.message || "—"}</td>
                <td>{report.email || "—"}</td>
                <td className={styles.actions}>
                  <button type="button" onClick={async () => { const result = await dismissReport(report.id); if (!result.ok) setError(result.error); }}>Dismiss</button>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!window.confirm(`Take down ${report.courseKey}? The course is deleted for everyone.`)) return;
                      const removed = await deleteCourse(report.courseKey);
                      if (!removed.ok) setError(removed.error);
                      const closed = await dismissReport(report.id);
                      if (!closed.ok) setError(closed.error);
                    }}
                  >
                    Take down
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
