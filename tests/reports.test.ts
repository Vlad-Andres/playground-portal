import fs from "node:fs";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({ unstable_cache: (fn: () => unknown) => fn, updateTag: () => undefined, revalidatePath: () => undefined }));

import { buildSiteData } from "@core/site";
import { memoryStore } from "@/lib/jobs/store";
import { createReportHandler, listOpenReports, REPORTS_PER_COURSE_PER_HOUR, setReportStatus } from "@/lib/reports";
import { writeSite } from "@/lib/sites/store";
import { fixtureCourse, fixtureLecture } from "./fixtures/site";

const key = "demo-course-0a1b2c3d";
const now = new Date("2026-11-14T12:00:00Z");

async function withCourse() {
  const store = memoryStore();
  const site = buildSiteData({ key, course: fixtureCourse, lectures: [fixtureLecture], exam: null, expected: [] });
  await writeSite(store, key, site, { formatVersion: 1, jobId: "0a1b2c3d", publishedAt: now.toISOString(), updatedAt: now.toISOString(), title: "Demo", lectures: 1, usage: { inputTokens: 0, outputTokens: 0, calls: 0 }, ownerHash: "", ownerId: "", version: 1, keepSources: false });
  return store;
}

const post = (body: unknown) => new Request("http://x/api/reports", { method: "POST", body: JSON.stringify(body), headers: { "content-type": "application/json" } });

describe("reports", () => {
  it("stores a report with only category, course, message, reply address, time and status", async () => {
    const store = await withCourse();
    const response = await createReportHandler(post({ courseKey: key, category: "wrong-content", message: "Lecture 2 has a wrong formula.", email: "a@b.test" }), store, now);
    expect(response.status).toBe(202);
    const [report] = await listOpenReports(store);
    expect(Object.keys(report).sort()).toEqual(["category", "courseKey", "createdAt", "email", "id", "message", "status"]);
    expect(report).toMatchObject({ courseKey: key, category: "wrong-content", status: "open", email: "a@b.test" });
  });

  it("rejects unknown courses, categories, long messages and bad addresses", async () => {
    const store = await withCourse();
    for (const body of [
      { courseKey: "missing-course-0a1b2c3e", category: "other" },
      { courseKey: key, category: "spam" },
      { courseKey: key, category: "other", message: "x".repeat(1001) },
      { courseKey: key, category: "other", email: "not-an-address" },
    ]) {
      expect((await createReportHandler(post(body), store, now)).status, JSON.stringify(body).slice(0, 60)).toBe(400);
    }
    expect(await listOpenReports(store)).toEqual([]);
  });

  it("accepts at most 5 reports per course per hour", async () => {
    const store = await withCourse();
    expect(REPORTS_PER_COURSE_PER_HOUR).toBe(5);
    for (let i = 0; i < 5; i += 1) expect((await createReportHandler(post({ courseKey: key, category: "other" }), store, now)).status).toBe(202);
    expect((await createReportHandler(post({ courseKey: key, category: "other" }), store, now)).status).toBe(429);
    expect((await createReportHandler(post({ courseKey: key, category: "other" }), store, new Date("2026-11-14T13:00:00Z"))).status).toBe(202);
  });

  it("a dismissed report leaves the open queue", async () => {
    const store = await withCourse();
    await createReportHandler(post({ courseKey: key, category: "copyright" }), store, now);
    const [report] = await listOpenReports(store);
    expect(await setReportStatus(store, report.id, "dismissed")).toBe(true);
    expect(await listOpenReports(store)).toEqual([]);
    expect(await setReportStatus(store, "nope", "dismissed")).toBe(false);
  });

  it("every course links to the report page, and admin shows the queue", () => {
    expect(fs.readFileSync("app/courses/[key]/layout.tsx", "utf8")).toMatch(/href=\{`\/report\?course=\$\{key\}`\}/);
    expect(fs.existsSync("app/report/page.tsx")).toBe(true);
    expect(fs.readFileSync("app/admin/page.tsx", "utf8")).toMatch(/<ReportQueue /);
  });
});
