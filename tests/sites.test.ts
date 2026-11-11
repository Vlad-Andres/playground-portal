import { describe, expect, it } from "vitest";
import { cannedModel, type Brief, type Material } from "@core/generate/index";
import { buildSiteData, siteDataSchema } from "@core/site";
import { cleanupHandler } from "@/lib/api/handlers";
import { advance, createJob, type JobState } from "@/lib/jobs/steps";
import { memoryStore } from "@/lib/jobs/store";
import { portalPublisher } from "@/lib/publish/portal";
import { COURSE_KEY, courseKeyFor, deleteSite, readSite, siteKey, writeSite } from "@/lib/sites/store";
import { fixtureCourse, fixtureLecture } from "./fixtures/site";

const brief: Brief = { language: "en", level: "university", depth: "cram", examMode: true, quizzes: true, widgets: true, context: "" };
const materials: Material[] = [
  { name: "a.txt", pages: [{ n: 1, text: "Energy is conserved. ".repeat(20) }] },
  { name: "b.txt", pages: [{ n: 1, text: "Kinetic energy is half m v squared. ".repeat(20) }] },
];

function setup(start = new Date("2026-11-11T10:00:00Z")) {
  let clock = start.getTime();
  const now = () => new Date(clock);
  const store = memoryStore(now);
  const deps = { store, model: cannedModel(), now, publish: portalPublisher(store, now) };
  return { store, deps, now, tick: (days: number) => (clock += days * 86_400_000) };
}

/** Create a job and drive it to the end, approving the outline when it waits for review. */
async function runJob(ctx: ReturnType<typeof setup>): Promise<JobState> {
  const { id } = await createJob(ctx.store, { brief, materials }, ctx.now());
  let state = await advance(id, ctx.deps);
  expect(state.status).toBe("awaiting-review");
  await ctx.store.write(`jobs/${id}/state.json`, JSON.stringify({ ...state, step: "lecture:1", status: "idle" }));
  for (let i = 0; i < 30 && state.status !== "done" && state.status !== "failed"; i += 1) state = await advance(id, ctx.deps);
  return state;
}

function keyOf(state: JobState): string {
  const match = /^\/courses\/([^/]+)\/$/.exec(state.siteUrl ?? "");
  if (!match) throw new Error(`No course URL in ${JSON.stringify(state)}`);
  return match[1];
}

describe("course keys", () => {
  it("are a slug plus the first 8 hex of the job id", () => {
    expect(courseKeyFor("Energy & Motion", "abcd1234-5678-9012-3456-abcdef123456")).toBe("energy-motion-abcd1234");
    expect(courseKeyFor("é".repeat(5), "abcd1234-x")).toBe("eeeee-abcd1234");
    const long = courseKeyFor("x".repeat(200), "abcd1234-5678");
    expect(long).toMatch(COURSE_KEY);
    expect(courseKeyFor("!!!", "abcd1234-5678")).toBe("course-abcd1234");
  });

  it("store sites under courses/<key>/site.json", () => {
    expect(siteKey("energy-abcd1234")).toBe("courses/energy-abcd1234/site.json");
  });
});

describe("portal publishing", () => {
  it("a fake-model job ends done with a /courses/<key>/ URL and a valid stored site", async () => {
    const ctx = setup();
    const state = await runJob(ctx);
    expect(state.status).toBe("done");
    const key = keyOf(state);
    expect(key).toMatch(COURSE_KEY);
    expect(key.endsWith(state.id.slice(0, 8))).toBe(true);
    const site = await readSite(ctx.store, key);
    expect(site).not.toBeNull();
    expect(siteDataSchema.safeParse(site).success).toBe(true);
    expect(site?.key).toBe(key);
    expect(site?.lectures.length).toBeGreaterThan(0);
  });

  it("two jobs from the same material get different keys, so their progress does not mix", async () => {
    const ctx = setup();
    const first = keyOf(await runJob(ctx));
    const second = keyOf(await runJob(ctx));
    expect(first).not.toBe(second);
    const [a, b] = await Promise.all([readSite(ctx.store, first), readSite(ctx.store, second)]);
    expect(a?.course.id).toBe(b?.course.id);
    expect(a?.key).not.toBe(b?.key);
  });

  it("the cleanup cron deletes an old job but keeps its course", async () => {
    const ctx = setup();
    const state = await runJob(ctx);
    const key = keyOf(state);
    ctx.tick(8);
    const env = { CRON_SECRET: "a-cron-secret-of-enough-length" } as unknown as NodeJS.ProcessEnv;
    const request = new Request("http://x/api/cron/cleanup", { headers: { authorization: `Bearer ${env.CRON_SECRET}` } });
    const result = await (await cleanupHandler(request, ctx.store, env, ctx.now())).json();
    expect(result.deletedJobs).toBe(1);
    expect(await ctx.store.list(`jobs/${state.id}/`)).toEqual([]);
    expect(await readSite(ctx.store, key)).not.toBeNull();
  });

  it("check reports failed for a course that is not stored", async () => {
    const { store } = setup();
    expect(await portalPublisher(store).check({ repo: "nothing-abcd1234", commitSha: "" })).toEqual({ state: "failed" });
  });

  it("refuses a bundle with a path outside the allow-list", async () => {
    const { store } = setup();
    const files = { "course.json": JSON.stringify(fixtureCourse), "../evil.json": "{}" };
    await expect(portalPublisher(store).start({ repoName: "demo-abcd1234", files })).rejects.toThrow(/Not allowed/);
  });
});

describe("readSite, writeSite, deleteSite", () => {
  const key = "demo-12345678";
  const site = buildSiteData({ key, course: fixtureCourse, lectures: [fixtureLecture], exam: null, expected: [] });

  it.each([["../x"], ["ABC-1234abcd"], ["demo-1234"], [""], ["unknown-abcd1234"]])("returns null for %j", async (bad) => {
    const { store } = setup();
    await writeSite(store, key, site, { jobId: "12345678", publishedAt: "2026-11-11T10:00:00Z" });
    expect(await readSite(store, bad)).toBeNull();
  });

  it("returns null for a corrupted or foreign file", async () => {
    const { store } = setup();
    await store.write(siteKey(key), "{not json");
    expect(await readSite(store, key)).toBeNull();
    await store.write(siteKey(key), JSON.stringify({ ...site, lectures: "nope" }));
    expect(await readSite(store, key)).toBeNull();
    await store.write(siteKey(key), JSON.stringify({ ...site, key: "other-12345678" }));
    expect(await readSite(store, key)).toBeNull();
  });

  it("refuses to write a site under another key", async () => {
    const { store } = setup();
    await expect(writeSite(store, "other-12345678", site, { jobId: "x", publishedAt: "" })).rejects.toThrow();
    await expect(writeSite(store, "../x", site, { jobId: "x", publishedAt: "" })).rejects.toThrow();
  });

  it("deleteSite removes both files", async () => {
    const { store } = setup();
    await writeSite(store, key, site, { jobId: "12345678", publishedAt: "2026-11-11T10:00:00Z" });
    expect(await store.list(`courses/${key}/`)).toHaveLength(2);
    expect(await deleteSite(store, key)).toBe(true);
    expect(await store.list(`courses/${key}/`)).toEqual([]);
    expect(await deleteSite(store, key)).toBe(false);
    expect(await deleteSite(store, "../x")).toBe(false);
  });
});
