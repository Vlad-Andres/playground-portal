import type { Feedback } from "@/lib/feedback";
import styles from "./admin.module.css";

/** Private feedback, newest first, with the average per course. */
export function FeedbackList({ entries, averages, titles }: { entries: Feedback[]; averages: Record<string, { count: number; average: number }>; titles: Map<string, string> }) {
  if (entries.length === 0) return <div className={styles.card}>No feedback yet.</div>;
  return (
    <div className={styles.card}>
      <div className={styles.scroll}>
        <table className={styles.table}>
          <thead><tr><th>Course</th><th>Average</th><th>Ratings</th></tr></thead>
          <tbody>
            {Object.entries(averages).sort(([, a], [, b]) => b.count - a.count).map(([key, row]) => (
              <tr key={key}><td>{titles.get(key) ?? key}</td><td>{row.average.toFixed(1)} / 5</td><td>{row.count}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className={styles.scroll}>
        <table className={styles.table}>
          <thead><tr><th>When</th><th>Course</th><th>Where</th><th>Rating</th><th>Comment</th></tr></thead>
          <tbody>
            {entries.slice(0, 100).map((entry) => (
              <tr key={entry.id}>
                <td>{entry.createdAt.slice(0, 16).replace("T", " ")}</td>
                <td>{titles.get(entry.courseKey) ?? entry.courseKey}</td>
                <td>{entry.where === "created" ? "after creating" : "on the course"}</td>
                <td>{"★".repeat(entry.rating)}</td>
                <td>{entry.comment || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
