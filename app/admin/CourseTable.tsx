"use client";

import { useState } from "react";
import { deleteCourse } from "./actions";
import styles from "./admin.module.css";

export interface CourseRow {
  key: string;
  title: string;
  lectures: number;
  published: string;
  tokens: string;
  cost: string;
}

export function CourseTable({ rows }: { rows: CourseRow[] }) {
  const [error, setError] = useState("");
  if (rows.length === 0) return <div className={styles.card}>No courses yet.</div>;
  return (
    <div className={styles.card}>
      {error ? <p className={styles.error} role="alert">{error}</p> : null}
      <div className={styles.scroll}>
        <table className={styles.table}>
          <thead>
            <tr><th>Title</th><th>Key</th><th>Lectures</th><th>Published</th><th>Tokens</th><th>Cost (estimate)</th><th /></tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key}>
                <td>{row.title || "—"}</td>
                <td><code>{row.key}</code></td>
                <td>{row.lectures}</td>
                <td>{row.published}</td>
                <td>{row.tokens}</td>
                <td>{row.cost}</td>
                <td className={styles.actions}>
                  <a href={`/courses/${row.key}/`} target="_blank" rel="noreferrer">Open</a>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!window.confirm("Delete this course? This cannot be undone.")) return;
                      const result = await deleteCourse(row.key);
                      setError(result.ok ? "" : result.error);
                    }}
                  >
                    Delete
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
