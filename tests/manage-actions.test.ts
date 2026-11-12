import { beforeEach, describe, expect, it, vi } from "vitest";

const updateTag = vi.fn();
vi.mock("next/cache", () => ({ unstable_cache: (fn: () => unknown) => fn, updateTag: (tag: string) => updateTag(tag), revalidatePath: () => undefined }));

import { memoryStore } from "@/lib/jobs/store";
const store = memoryStore();
vi.mock("@/lib/jobs/store", async () => ({ ...(await vi.importActual<object>("@/lib/jobs/store")), defaultStore: () => store }));

import { buildSiteData } from "@core/site";
import { removeCourse, saveCourse } from "@/app/manage/[token]/actions";
import { findCourseByOwnerToken, newOwnerToken, ownerHash, readMeta, readSite, siteKey, writeSite } from "@/lib/sites/store";
import { fixtureCourse, fixtureLecture } from "./fixtures/site";

const key = "demo-12345678";
let token = "";

beforeEach(async () => {
  for (const { key: stored } of await store.list("")) await store.delete([stored]);
  updateTag.mockClear();
  token = newOwnerToken();
  const site = buildSiteData({ key, course: fixtureCourse, lectures: [fixtureLecture], exam: null, expected: [] });
  await writeSite(store, key, site, {
    formatVersion: 1,
    jobId: "12345678",
    publishedAt: "2026-11-11T10:00:00Z",
    updatedAt: "2026-11-11T10:00:00Z",
    title: "Demo course",
    lectures: 1,
    usage: { inputTokens: 10, outputTokens: 5, calls: 2 },
    ownerHash: ownerHash(token),
  });
});

describe("saveCourse", () => {
  it("answers not-found for a wrong or malformed token and writes nothing", async () => {
    const before = await store.read(siteKey(key));
    expect(await saveCourse(newOwnerToken(), { title: "Hacked" })).toEqual({ ok: false, code: "not-found" });
    expect(await saveCourse("short", { title: "Hacked" })).toEqual({ ok: false, code: "not-found" });
    expect(await store.read(siteKey(key))).toBe(before);
    expect(updateTag).not.toHaveBeenCalled();
  });

  it("stores a valid title change and updates the meta without touching the owner or publish date", async () => {
    expect(await saveCourse(token, { title: "Renamed course" })).toEqual({ ok: true });
    expect((await readSite(store, key))?.course.title).toBe("Renamed course");
    const meta = await readMeta(store, key);
    expect(meta).toMatchObject({ title: "Renamed course", ownerHash: ownerHash(token), publishedAt: "2026-11-11T10:00:00Z", jobId: "12345678", usage: { inputTokens: 10, outputTokens: 5, calls: 2 } });
    expect(meta?.updatedAt).not.toBe("2026-11-11T10:00:00Z");
    expect(await findCourseByOwnerToken(store, token)).toBe(key);
    expect(updateTag).toHaveBeenCalledWith(`course:${key}`);
  });

  it("answers bad-request for a patch of the wrong shape", async () => {
    expect(await saveCourse(token, { title: "x", surprise: true })).toEqual({ ok: false, code: "bad-request" });
    expect(await saveCourse(token, "nope")).toEqual({ ok: false, code: "bad-request" });
  });

  it("leaves the course byte-identical when the patch is refused (last-lecture)", async () => {
    const before = await store.read(siteKey(key));
    const metaBefore = await store.read(`courses/${key}/meta.json`);
    expect(await saveCourse(token, { lectures: [{ slug: "intro", remove: true }] })).toEqual({ ok: false, code: "last-lecture" });
    expect(await store.read(siteKey(key))).toBe(before);
    expect(await store.read(`courses/${key}/meta.json`)).toBe(metaBefore);
    expect(updateTag).not.toHaveBeenCalled();
  });

  it("never returns or logs the token", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const result = await saveCourse(token, { title: "Renamed course" });
    expect(JSON.stringify(result)).not.toContain(token);
    expect(log.mock.calls.map((call) => String(call[0])).join("\n")).not.toContain(token);
    log.mockRestore();
  });
});

describe("removeCourse", () => {
  it("deletes the course and its owner lookup, then reports false the second time", async () => {
    expect(await removeCourse(token)).toEqual({ ok: true });
    expect(await store.read(siteKey(key))).toBeNull();
    expect(await findCourseByOwnerToken(store, token)).toBeNull();
    expect((await store.list("owners/")).length).toBe(0);
    expect(updateTag).toHaveBeenCalledWith(`course:${key}`);
    expect(await removeCourse(token)).toEqual({ ok: false });
  });

  it("does nothing for a wrong token", async () => {
    expect(await removeCourse(newOwnerToken())).toEqual({ ok: false });
    expect(await store.read(siteKey(key))).not.toBeNull();
  });
});
