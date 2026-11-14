import fs from "node:fs";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({ unstable_cache: (fn: () => unknown) => fn, updateTag: () => undefined, revalidatePath: () => undefined }));

import { buildSiteData } from "@core/site";
import { createFeedbackHandler, FEEDBACK_PER_COURSE_PER_HOUR, listFeedback, summariseFeedback } from "@/lib/feedback";
import { memoryStore } from "@/lib/jobs/store";
import { writeSite } from "@/lib/sites/store";
import { fixtureCourse, fixtureLecture } from "./fixtures/site";

const key = "demo-course-0a1b2c3d";
const now = new Date("2026-11-14T12:00:00Z");
const post = (body: unknown) => new Request("http://x/api/feedback", { method: "POST", body: JSON.stringify(body), headers: { "content-type": "application/json" } });

async function withCourse() {
  const store = memoryStore();
  const site = buildSiteData({ key, course: fixtureCourse, lectures: [fixtureLecture], exam: null, expected: [] });
  await writeSite(store, key, site, { formatVersion: 1, jobId: "0a1b2c3d", publishedAt: now.toISOString(), updatedAt: now.toISOString(), title: "Demo", lectures: 1, usage: { inputTokens: 0, outputTokens: 0, calls: 0 }, ownerHash: "", ownerId: "", version: 1, keepSources: false });
  return store;
}

describe("feedback", () => {
  it("stores a 1-5 rating, an optional comment, where it was given, the course and the time; nothing about the person", async () => {
    const store = await withCourse();
    expect((await createFeedbackHandler(post({ courseKey: key, where: "course", rating: 4, comment: "Clear quizzes." }), store, now)).status).toBe(202);
    const [entry] = await listFeedback(store);
    expect(Object.keys(entry).sort()).toEqual(["comment", "courseKey", "createdAt", "id", "rating", "where"]);
    expect(entry).toMatchObject({ courseKey: key, where: "course", rating: 4, comment: "Clear quizzes." });
  });

  it("rejects ratings outside 1-5, long comments, unknown places, unknown courses and extra fields", async () => {
    const store = await withCourse();
    for (const body of [
      { courseKey: key, where: "course", rating: 0 },
      { courseKey: key, where: "course", rating: 6 },
      { courseKey: key, where: "course", rating: 3.5 },
      { courseKey: key, where: "course", rating: 3, comment: "x".repeat(1001) },
      { courseKey: key, where: "landing", rating: 3 },
      { courseKey: "missing-course-0a1b2c3e", where: "course", rating: 3 },
      { courseKey: key, where: "course", rating: 3, email: "a@b.test" },
    ]) {
      expect((await createFeedbackHandler(post(body), store, now)).status, JSON.stringify(body).slice(0, 70)).toBe(400);
    }
    expect(await listFeedback(store)).toEqual([]);
  });

  it("accepts at most 10 per course per hour", async () => {
    const store = await withCourse();
    expect(FEEDBACK_PER_COURSE_PER_HOUR).toBe(10);
    for (let i = 0; i < 10; i += 1) expect((await createFeedbackHandler(post({ courseKey: key, where: "course", rating: 5 }), store, now)).status).toBe(202);
    expect((await createFeedbackHandler(post({ courseKey: key, where: "course", rating: 5 }), store, now)).status).toBe(429);
  });

  it("summarises the average and count per course", async () => {
    const store = await withCourse();
    for (const rating of [5, 4, 3]) await createFeedbackHandler(post({ courseKey: key, where: "course", rating }), store, now);
    expect(summariseFeedback(await listFeedback(store))).toEqual({ [key]: { count: 3, average: 4 } });
  });

  it("is asked after a course is built and under every course", () => {
    expect(fs.readFileSync("app/jobs/[id]/page.tsx", "utf8")).toMatch(/<FeedbackPrompt [^>]*where="created"/);
    expect(fs.readFileSync("app/courses/[key]/layout.tsx", "utf8")).toMatch(/<FeedbackPrompt [^>]*where="course"/);
    expect(fs.readFileSync("components/feedback/FeedbackPrompt.tsx", "utf8")).not.toMatch(/<form[^>]*action=/);
  });
});
