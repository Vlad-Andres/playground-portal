import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { Store } from "@/lib/jobs/store";
import { COURSE_KEY } from "@/lib/sites/store";

/**
 * Beta measurement: one marker per event, keyed only by day, event name, beta group and course key.
 * No cookies, no person or browser identifier, no course text, titles, answers or file names.
 */
export const METRIC_NAMES = [
  "landing_view",
  "demo_open",
  "job_submitted",
  "job_published",
  "job_failed",
  "course_open",
  "quiz_completed",
  "review_completed",
  "exam_completed",
  "assistant_question",
  "share_copied",
  "report_sent",
  "feedback_sent",
] as const;
export type MetricName = (typeof METRIC_NAMES)[number];

/** The only events a browser may send. */
export const CLIENT_METRICS = ["course_open", "demo_open", "quiz_completed", "review_completed", "exam_completed", "share_copied"] as const satisfies readonly MetricName[];

const STUDY: readonly MetricName[] = ["quiz_completed", "review_completed", "exam_completed"];
export const METRICS_RETENTION_DAYS = 90;
const NONE = "_";

const dayOf = (now: Date) => now.toISOString().slice(0, 10);

/** Records one event. Measurement must never break the product, so failures are swallowed. */
export async function recordMetric(store: Store, name: MetricName, now: Date, scope: { group?: string; courseKey?: string } = {}): Promise<void> {
  const group = scope.group && /^[a-z0-9]{1,16}$/.test(scope.group) ? scope.group : NONE;
  const course = scope.courseKey && COURSE_KEY.test(scope.courseKey) ? scope.courseKey : NONE;
  try {
    await store.write(`metrics/${dayOf(now)}/${name}/${group}/${course}/${randomUUID()}`, "1");
  } catch {
    // measurement is best-effort
  }
}

const clientSchema = z.object({ type: z.enum(CLIENT_METRICS), courseKey: z.string().regex(COURSE_KEY) }).strict();

/** POST /api/metrics from course pages (sent with sendBeacon). */
export async function metricsHandler(request: Request, store: Store, now: Date = new Date()): Promise<Response> {
  let raw: unknown;
  try {
    raw = JSON.parse((await request.text()).slice(0, 500));
  } catch {
    return new Response(null, { status: 400 });
  }
  const body = clientSchema.safeParse(raw);
  if (!body.success) return new Response(null, { status: 400 });
  await recordMetric(store, body.data.type, now, { courseKey: body.data.courseKey });
  return new Response(null, { status: 204 });
}

export interface MetricsSummary {
  /** Newest first. */
  days: { day: string; counts: Partial<Record<MetricName, number>> }[];
  /** Per invite code id ("env" for the environment code): jobs over the period. */
  groups: Record<string, { submitted: number; published: number; failed: number }>;
  /** Per course: opens, study actions and on how many different days it was opened. */
  courses: Record<string, { opens: number; study: number; activeDays: number }>;
}

export async function metricsSummary(store: Store, now: Date, days = 14): Promise<MetricsSummary> {
  const summary: MetricsSummary = { days: [], groups: {}, courses: {} };
  const openDays = new Map<string, Set<string>>();
  for (let offset = 0; offset < days; offset += 1) {
    const day = dayOf(new Date(now.getTime() - offset * 86_400_000));
    const counts: Partial<Record<MetricName, number>> = {};
    for (const { key } of await store.list(`metrics/${day}/`)) {
      const [, , name, group, course] = key.split("/") as [string, string, MetricName, string, string];
      if (!(METRIC_NAMES as readonly string[]).includes(name)) continue;
      counts[name] = (counts[name] ?? 0) + 1;
      if (name === "job_submitted" || name === "job_published" || name === "job_failed") {
        const entry = (summary.groups[group] ??= { submitted: 0, published: 0, failed: 0 });
        entry[name === "job_submitted" ? "submitted" : name === "job_published" ? "published" : "failed"] += 1;
      }
      if (course !== NONE && (name === "course_open" || STUDY.includes(name))) {
        const entry = (summary.courses[course] ??= { opens: 0, study: 0, activeDays: 0 });
        if (name === "course_open") {
          entry.opens += 1;
          const seen = openDays.get(course) ?? new Set<string>();
          seen.add(day);
          openDays.set(course, seen);
          entry.activeDays = seen.size;
        } else entry.study += 1;
      }
    }
    summary.days.push({ day, counts });
  }
  return summary;
}

/** Markers older than the retention period, for the daily cleanup. */
export async function expiredMetricKeys(store: Store, now: Date): Promise<string[]> {
  const cutoff = now.getTime() - METRICS_RETENTION_DAYS * 86_400_000;
  return (await store.list("metrics/")).map(({ key }) => key).filter((key) => Date.parse(key.split("/")[1] ?? "") < cutoff);
}
