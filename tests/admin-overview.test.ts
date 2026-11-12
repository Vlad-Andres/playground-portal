import { describe, expect, it, vi } from "vitest";

// unstable_cache needs Next's request context; in tests it simply calls through.
vi.mock("next/cache", () => ({ unstable_cache: (fn: () => unknown) => fn, updateTag: () => undefined, revalidatePath: () => undefined }));

import { buildSiteData } from "@core/site";
import { estimateCost, listJobs, overview, removeCourseAsAdmin } from "@/lib/admin/overview";
import { dayPrefix } from "@/lib/guard";
import { jobKey, type JobState } from "@/lib/jobs/state";
import { memoryStore } from "@/lib/jobs/store";
import { loadSite } from "@/lib/sites/load";
import { listCourses, writeSite } from "@/lib/sites/store";
import { fixtureCourse, fixtureLecture } from "./fixtures/site";

const now = new Date("2026-11-12T12:00:00Z");

function state(id: string, createdAt: string, extra: Partial<JobState> = {}): JobState {
  return { id, step: "plan", status: "idle", lecturesTotal: 0, lecturesDone: 0, attempts: 0, usage: { inputTokens: 0, outputTokens: 0, calls: 0 }, createdAt, updatedAt: createdAt, ...extra };
}

const ids = ["00000000-0000-4000-8000-000000000001", "00000000-0000-4000-8000-000000000002", "00000000-0000-4000-8000-000000000003"];

async function putCourse(store: ReturnType<typeof memoryStore>, key: string, usage = { inputTokens: 1000, outputTokens: 500, calls: 3 }, publishedAt = "2026-11-11T10:00:00Z") {
  const site = buildSiteData({ key, course: fixtureCourse, lectures: [fixtureLecture], exam: null, expected: [] });
  await writeSite(store, key, site, { formatVersion: 1, jobId: key.slice(-8), publishedAt, updatedAt: publishedAt, title: "Demo", lectures: 1, usage, ownerHash: "" });
}

describe("estimateCost", () => {
  it("is 1.75 USD for a million tokens each way", () => {
    expect(estimateCost({ inputTokens: 1_000_000, outputTokens: 1_000_000 })).toBeCloseTo(1.75, 10);
    expect(estimateCost({ inputTokens: 0, outputTokens: 0 })).toBe(0);
  });
});

describe("listJobs", () => {
  it("returns the newest first, honours the limit and skips a corrupted file", async () => {
    const store = memoryStore();
    await store.write(jobKey(ids[0], "state.json"), JSON.stringify(state(ids[0], "2026-11-10T10:00:00Z")));
    await store.write(jobKey(ids[1], "state.json"), JSON.stringify(state(ids[1], "2026-11-12T10:00:00Z")));
    await store.write(jobKey(ids[2], "state.json"), "{broken");
    await store.write(jobKey(ids[0], "materials.json"), "[]");
    const jobs = await listJobs(store);
    expect(jobs.map((job) => job.id)).toEqual([ids[1], ids[0]]);
    expect(await listJobs(store, 1)).toHaveLength(1);
  });
});

describe("overview", () => {
  it("counts today's jobs and totals the courses", async () => {
    const store = memoryStore();
    await store.write(jobKey(ids[0], "state.json"), JSON.stringify(state(ids[0], "2026-11-12T09:00:00Z")));
    await store.write(`${dayPrefix("2026-11-12")}${ids[0]}`, "1");
    await store.write(`${dayPrefix("2026-11-11")}${ids[1]}`, "1");
    await putCourse(store, "demo-aaaaaaaa", { inputTokens: 1_000_000, outputTokens: 0, calls: 1 });
    await putCourse(store, "demo-bbbbbbbb", { inputTokens: 0, outputTokens: 1_000_000, calls: 1 }, "2026-11-12T08:00:00Z");
    const result = await overview(store, now);
    expect(result.jobsToday).toBe(1);
    expect(result.jobs).toHaveLength(1);
    expect(result.courses.map((course) => course.key)).toEqual(["demo-bbbbbbbb", "demo-aaaaaaaa"]);
    expect(result.totals).toMatchObject({ courses: 2, inputTokens: 1_000_000, outputTokens: 1_000_000 });
    expect(result.totals.costUsd).toBeCloseTo(1.75, 10);
  });
});

describe("removeCourseAsAdmin", () => {
  it("removes the course from the list and from loadSite", async () => {
    const store = memoryStore();
    await putCourse(store, "demo-aaaaaaaa");
    expect((await loadSite("demo-aaaaaaaa", store))?.course.title).toBeTruthy();
    expect(await removeCourseAsAdmin(store, "demo-aaaaaaaa")).toBe(true);
    expect(await listCourses(store)).toHaveLength(0);
    expect(await loadSite("demo-aaaaaaaa", store)).toBeNull();
    expect(await removeCourseAsAdmin(store, "demo-aaaaaaaa")).toBe(false);
  });
  it("refuses a malformed key", async () => {
    expect(await removeCourseAsAdmin(memoryStore(), "../x")).toBe(false);
  });
});
