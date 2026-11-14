import { describe, expect, it } from "vitest";
import { memoryStore } from "@/lib/jobs/store";
import { CLIENT_METRICS, expiredMetricKeys, METRIC_NAMES, METRICS_RETENTION_DAYS, metricsHandler, metricsSummary, recordMetric } from "@/lib/metrics";

const now = new Date("2026-11-14T12:00:00Z");
const key = "demo-course-0a1b2c3d";
const post = (body: unknown) => new Request("http://x/api/metrics", { method: "POST", body: JSON.stringify(body), headers: { "content-type": "text/plain" } });

describe("metrics", () => {
  it("knows a fixed list of events, and the browser may send only study and share ones", () => {
    expect(METRIC_NAMES).toContain("job_published");
    expect([...CLIENT_METRICS].sort()).toEqual(["course_open", "demo_open", "exam_completed", "quiz_completed", "review_completed", "share_copied"]);
    for (const name of CLIENT_METRICS) expect(METRIC_NAMES).toContain(name);
  });

  it("stores only the event, the day, a beta group and a course key", async () => {
    const store = memoryStore();
    await recordMetric(store, "job_submitted", now, { group: "a1b2c3d4" });
    await recordMetric(store, "course_open", now, { courseKey: key });
    const keys = (await store.list("metrics/")).map((entry) => entry.key);
    expect(keys).toHaveLength(2);
    for (const stored of keys) expect(stored).toMatch(/^metrics\/2026-11-14\/[a-z_]+\/[^/]+\/[^/]+\/[0-9a-f-]{36}$/);
    expect(await store.read(keys[0])).toBe("1");
  });

  it("never throws, even when the store fails", async () => {
    const broken = { ...memoryStore(), write: async () => { throw new Error("down"); } };
    await expect(recordMetric(broken, "landing_view", now)).resolves.toBeUndefined();
  });

  it("accepts allowed browser events for a valid course and rejects the rest", async () => {
    const store = memoryStore();
    expect((await metricsHandler(post({ type: "quiz_completed", courseKey: key }), store, now)).status).toBe(204);
    for (const body of [{ type: "job_published", courseKey: key }, { type: "quiz_completed", courseKey: "../x" }, { type: "quiz_completed", courseKey: key, answer: "B" }]) {
      expect((await metricsHandler(post(body), store, now)).status).toBe(400);
    }
    expect(await store.list("metrics/")).toHaveLength(1);
  });

  it("summarises 14 days by day, by beta group and by course, with the days a course was opened", async () => {
    const store = memoryStore();
    const yesterday = new Date("2026-11-13T09:00:00Z");
    await recordMetric(store, "job_submitted", now, { group: "a1b2c3d4" });
    await recordMetric(store, "job_published", now, { group: "a1b2c3d4" });
    await recordMetric(store, "job_failed", yesterday, { group: "env" });
    await recordMetric(store, "course_open", now, { courseKey: key });
    await recordMetric(store, "course_open", yesterday, { courseKey: key });
    await recordMetric(store, "quiz_completed", now, { courseKey: key });
    await recordMetric(store, "course_open", new Date("2026-10-01T09:00:00Z"), { courseKey: key });
    const summary = await metricsSummary(store, now, 14);
    expect(summary.days[0]).toMatchObject({ day: "2026-11-14", counts: { job_submitted: 1, job_published: 1, course_open: 1, quiz_completed: 1 } });
    expect(summary.days[1]).toMatchObject({ day: "2026-11-13", counts: { job_failed: 1, course_open: 1 } });
    expect(summary.groups).toEqual({ a1b2c3d4: { submitted: 1, published: 1, failed: 0 }, env: { submitted: 0, published: 0, failed: 1 } });
    expect(summary.courses[key]).toEqual({ opens: 2, study: 1, activeDays: 2 });
  });

  it("lets the daily cleanup remove markers older than the retention period", async () => {
    const store = memoryStore();
    await recordMetric(store, "course_open", new Date("2026-07-01T09:00:00Z"), { courseKey: key });
    await recordMetric(store, "course_open", now, { courseKey: key });
    expect(METRICS_RETENTION_DAYS).toBe(90);
    const expired = await expiredMetricKeys(store, now);
    expect(expired).toHaveLength(1);
    expect(expired[0]).toContain("metrics/2026-07-01/");
  });
});
