import { describe, expect, it } from "vitest";
import { memoryStore } from "@/lib/jobs/store";
import { importBundle, MAX_IMPORT_BYTES } from "@/lib/sites/import";
import { findCourseByOwnerToken, readMeta, readSite } from "@/lib/sites/store";
import { fixtureCourse, fixtureLecture } from "./fixtures/site";

const now = new Date("2026-11-16T10:00:00Z");
const bundle = (files: Record<string, string>) => JSON.stringify({ format: "playground-bundle@1", files });
const good = bundle({ "course.json": JSON.stringify(fixtureCourse), "lectures/01-intro.json": JSON.stringify(fixtureLecture) });

describe("importBundle", () => {
  it("publishes a course bundle under a new key, with a private edit link", async () => {
    const store = memoryStore();
    const result = await importBundle(store, good, now);
    if (!result.ok) throw new Error(result.error);
    expect(result.key).toMatch(/^demo-[0-9a-f]{8}$/);
    expect(result.siteUrl).toBe(`/courses/${result.key}/`);
    expect((await readSite(store, result.key))?.course.title).toBe("Demo course");
    expect(await readMeta(store, result.key)).toMatchObject({ title: "Demo course", lectures: 1, ownerId: "", usage: { inputTokens: 0, outputTokens: 0, calls: 0 } });
    const token = result.manageUrl.replace("/manage/", "");
    expect(await findCourseByOwnerToken(store, token)).toBe(result.key);
  });

  it("two imports of the same bundle get different keys", async () => {
    const store = memoryStore();
    const a = await importBundle(store, good, now);
    const b = await importBundle(store, good, now);
    expect(a.ok && b.ok && a.key !== b.key).toBe(true);
  });

  it("refuses text that is not JSON, not a bundle, too large, or a bundle with a bad course", async () => {
    const store = memoryStore();
    for (const text of ["{not json", JSON.stringify({ format: "other", files: {} }), bundle({ "../evil.json": "{}" }), bundle({ "course.json": "{}" }), "x".repeat(MAX_IMPORT_BYTES + 1)]) {
      const result = await importBundle(store, text, now);
      expect(result.ok).toBe(false);
    }
    expect(await store.list("courses/")).toHaveLength(0);
  });
});
