import type { GroupRow, MetricName, MetricsSummary } from "@/lib/metrics";
import styles from "./admin.module.css";

const COLUMNS: [MetricName, string][] = [
  ["landing_view", "Landing"],
  ["job_submitted", "Jobs"],
  ["job_published", "Published"],
  ["job_failed", "Failed"],
  ["course_open", "Course opens"],
  ["quiz_completed", "Quizzes"],
  ["review_completed", "Reviews"],
  ["exam_completed", "Exams"],
  ["assistant_question", "Ask AI"],
  ["share_copied", "Shares"],
  ["feedback_sent", "Feedback"],
  ["report_sent", "Reports"],
];

/** Beta measurement for the last 14 days: counts only, no people. */
export function BetaNumbers({ summary, groups, titles }: { summary: MetricsSummary; groups: GroupRow[]; titles: Map<string, string> }) {
  const courses = Object.entries(summary.courses).sort(([, a], [, b]) => b.activeDays - a.activeDays || b.opens - a.opens).slice(0, 30);
  return (
    <div className={styles.card}>
      <div className={styles.scroll}>
        <table className={styles.table}>
          <thead><tr><th>Day</th>{COLUMNS.map(([, label]) => <th key={label}>{label}</th>)}</tr></thead>
          <tbody>
            {summary.days.map(({ day, counts }) => (
              <tr key={day}><td>{day}</td>{COLUMNS.map(([name]) => <td key={name}>{counts[name] ?? 0}</td>)}</tr>
            ))}
          </tbody>
        </table>
      </div>
      <h3>By beta group</h3>
      {groups.length === 0 ? <p>No jobs in the last 14 days.</p> : (
        <div className={styles.scroll}>
          <table className={styles.table}>
            <thead><tr><th>Group</th><th>Jobs</th><th>Published</th><th>Failed</th><th>Success</th></tr></thead>
            <tbody>
              {groups.map((row) => (
                <tr key={row.group}><td>{row.label}</td><td>{row.submitted}</td><td>{row.published}</td><td>{row.failed}</td><td>{row.success}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <h3>Courses in use</h3>
      {courses.length === 0 ? <p>No course opened in the last 14 days.</p> : (
        <div className={styles.scroll}>
          <table className={styles.table}>
            <thead><tr><th>Course</th><th>Days opened</th><th>Opens</th><th>Study actions</th></tr></thead>
            <tbody>
              {courses.map(([key, row]) => (
                <tr key={key}><td><a href={`/courses/${key}/`} target="_blank" rel="noreferrer">{titles.get(key) ?? key}</a></td><td>{row.activeDays}</td><td>{row.opens}</td><td>{row.study}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p>Counts only: no cookies, no person or browser identifiers. Several opens on one day by one person count separately; &ldquo;days opened&rdquo; is the best sign of returning use.</p>
    </div>
  );
}
