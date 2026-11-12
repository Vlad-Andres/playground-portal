import { dayKey, dayPrefix } from "@/lib/guard";
import { JOB_ID, jobKey, type JobState } from "@/lib/jobs/state";
import type { Store } from "@/lib/jobs/store";
import { logEvent } from "@/lib/log";
import { deleteSite, listCourses, type SiteMeta } from "@/lib/sites/store";

/** Estimated list prices per million tokens (gemini-3.1-flash-lite); shown to the admin only, always as an estimate. */
export const USD_PER_MILLION = { input: 0.25, output: 1.5 };

export function estimateCost(usage: { inputTokens: number; outputTokens: number }): number {
  return (usage.inputTokens * USD_PER_MILLION.input + usage.outputTokens * USD_PER_MILLION.output) / 1_000_000;
}

/** Every `jobs/<id>/state.json`, newest `createdAt` first (default 50). Unreadable files are skipped. */
export async function listJobs(store: Store, limit = 50): Promise<JobState[]> {
  const ids = (await store.list("jobs/"))
    .map(({ key }) => /^jobs\/([^/]+)\/state\.json$/.exec(key)?.[1])
    .filter((id): id is string => id !== undefined && JOB_ID.test(id));
  const states = await Promise.all(
    ids.map(async (id) => {
      try {
        const body = await store.read(jobKey(id, "state.json"));
        const value = body === null ? null : (JSON.parse(body) as JobState);
        return value && typeof value === "object" && value.id === id && typeof value.createdAt === "string" ? value : null;
      } catch {
        return null;
      }
    }),
  );
  return states
    .filter((state): state is JobState => state !== null)
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    .slice(0, limit);
}

export interface Overview {
  jobsToday: number;
  jobs: JobState[];
  courses: { key: string; meta: SiteMeta }[];
  totals: { courses: number; inputTokens: number; outputTokens: number; costUsd: number };
}

export async function overview(store: Store, now: Date): Promise<Overview> {
  const [jobsToday, jobs, courses] = await Promise.all([
    store.list(dayPrefix(dayKey(now))).then((entries) => entries.length),
    listJobs(store),
    listCourses(store),
  ]);
  const inputTokens = courses.reduce((sum, { meta }) => sum + meta.usage.inputTokens, 0);
  const outputTokens = courses.reduce((sum, { meta }) => sum + meta.usage.outputTokens, 0);
  return { jobsToday, jobs, courses, totals: { courses: courses.length, inputTokens, outputTokens, costUsd: estimateCost({ inputTokens, outputTokens }) } };
}

/** Delete a course for the admin. The caller must invalidate the course's cache tag afterwards. */
export async function removeCourseAsAdmin(store: Store, key: string): Promise<boolean> {
  const removed = await deleteSite(store, key);
  if (removed) logEvent("course.deleted", { key, by: "admin" });
  return removed;
}
