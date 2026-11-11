import { describe, expect, it } from "vitest";
import { bundleSchema, cannedModel, type Brief } from "@core/generate/index";
import { courseSchema, lectureFileSchema } from "@core/schema";
import { validateCourseData } from "@core/validate";
import { advanceHandler, cleanupHandler, createJobHandler, getJobHandler, MAX_BODY_BYTES, outlineHandler } from "@/lib/api/handlers";
import { jobKey } from "@/lib/jobs/state";
import { memoryStore } from "@/lib/jobs/store";

const CODE = "correct-horse-battery";
const env = { PORTAL_ENABLE_GENERATION: "true", PORTAL_ACCESS_CODE: CODE, PORTAL_DAILY_JOB_LIMIT: "2", CRON_SECRET: "0123456789abcdef0123" } as unknown as NodeJS.ProcessEnv;
const brief: Brief = { language: "en", level: "school", depth: "cram", examMode: true, quizzes: true, widgets: true, context: "" };
const materials = [
  { name: "a.txt", pages: [{ n: 1, text: "Plants make glucose from light. ".repeat(20) }] },
  { name: "b.txt", pages: [{ n: 1, text: "Animals eat plants for energy. ".repeat(20) }] },
];

function post(body: unknown): Request {
  return new Request("http://x/api/jobs", { method: "POST", body: typeof body === "string" ? body : JSON.stringify(body), headers: { "content-type": "application/json" } });
}
const valid = () => post({ accessCode: CODE, brief, materials });

describe("POST /api/jobs", () => {
  it("503 when generation is disabled", async () => {
    expect((await createJobHandler(valid(), memoryStore(), { ...env, PORTAL_ENABLE_GENERATION: "false" })).status).toBe(503);
  });
  it("401 with a wrong access code", async () => {
    expect((await createJobHandler(post({ accessCode: "nope", brief, materials }), memoryStore(), env)).status).toBe(401);
  });
  it("400 for an unknown language or level", async () => {
    expect((await createJobHandler(post({ accessCode: CODE, brief: { ...brief, language: "xx" }, materials }), memoryStore(), env)).status).toBe(400);
  });
  it("400 for scanned material and for a bad shape", async () => {
    const scanned = [{ name: "s.pdf", pages: [{ n: 1, text: "1" }, { n: 2, text: "" }] }];
    const response = await createJobHandler(post({ accessCode: CODE, brief, materials: scanned }), memoryStore(), env);
    expect(response.status).toBe(400);
    expect((await response.json()).code).toBe("scanned");
    expect((await createJobHandler(post("{not json"), memoryStore(), env)).status).toBe(400);
  });
  it("413 above 4 MB", async () => {
    const big = post({ accessCode: CODE, brief, materials: [{ name: "a.txt", pages: [{ n: 1, text: "x".repeat(MAX_BODY_BYTES) }] }] });
    expect((await createJobHandler(big, memoryStore(), env)).status).toBe(413);
  });
  it("202 with an id, then 429 when the daily limit is reached", async () => {
    const store = memoryStore();
    const first = await createJobHandler(valid(), store, env);
    expect(first.status).toBe(202);
    expect((await first.json()).id).toMatch(/^[0-9a-f-]{36}$/);
    expect((await createJobHandler(valid(), store, env)).status).toBe(202);
    expect((await createJobHandler(valid(), store, env)).status).toBe(429);
  });
});

describe("job routes", () => {
  it("full run with the fake model ends in done with a valid bundle", async () => {
    const store = memoryStore();
    const deps = () => ({ store, model: cannedModel(), now: () => new Date() });
    const { id } = await (await createJobHandler(valid(), store, env)).json();

    // wrong-state cases before the plan exists
    expect((await outlineHandler(id, new Request("http://x", { method: "PUT", body: "{}" }), store)).status).toBe(409);

    let state = await (await advanceHandler(id, deps, env)).json();
    expect(state.status).toBe("awaiting-review");
    const job = await (await getJobHandler(id, store)).json();
    expect(job.outline).toHaveLength(2);
    expect(JSON.stringify(job)).not.toContain("Plants make glucose");

    const keep = [job.outline[1].slug];
    expect((await outlineHandler(id, new Request("http://x", { method: "PUT", body: JSON.stringify({ keep: [], titles: {} }) }), store)).status).toBe(400);
    expect((await outlineHandler(id, new Request("http://x", { method: "PUT", body: JSON.stringify({ keep: ["nope"], titles: {} }) }), store)).status).toBe(400);
    const outlined = await outlineHandler(id, new Request("http://x", { method: "PUT", body: JSON.stringify({ keep, titles: { [keep[0]]: "Renamed" } }) }), store);
    expect(outlined.status).toBe(200);
    expect((await outlined.json()).lecturesTotal).toBe(1);

    for (let i = 0; i < 10 && state.status !== "done"; i += 1) state = await (await advanceHandler(id, deps, env)).json();
    expect(state).toMatchObject({ status: "done", lecturesDone: 1 });
    // Learners and authors never see usage, models or internal files.
    for (const body of [state, await (await getJobHandler(id, store)).json()]) {
      expect(Object.keys(body)).not.toContain("usage");
      expect(Object.keys(body)).not.toContain("bundleReady");
      expect(JSON.stringify(body)).not.toMatch(/token|model|gemini/i);
    }

    const bundle = bundleSchema.parse(JSON.parse((await store.read(jobKey(id, "bundle.json"))) ?? "null"));
    const lectures = Object.entries(bundle.files).filter(([path]) => path.startsWith("lectures/"));
    expect(lectures).toHaveLength(1);
    const problems = validateCourseData({
      course: courseSchema.parse(JSON.parse(bundle.files["course.json"])),
      lectures: lectures.map(([file, text]) => ({ file, data: lectureFileSchema.parse(JSON.parse(text)) })),
      exam: bundle.files["exam.json"] ? lectureFileSchema.parse(JSON.parse(bundle.files["exam.json"])) : null,
      expected: [],
      figures: new Set(),
    });
    expect(problems.filter((problem) => problem.severity === "error")).toEqual([]);
    expect(JSON.parse(lectures[0][1]).meta.title).toBe("Renamed");
  });

  it("400 for a malformed id, 404 for an unknown job, 503 when advancing while disabled", async () => {
    const store = memoryStore();
    expect((await getJobHandler("../x", store)).status).toBe(400);
    expect((await getJobHandler("00000000-0000-4000-8000-000000000000", store)).status).toBe(404);
    const deps = () => ({ store, model: cannedModel(), now: () => new Date() });
    expect((await advanceHandler("00000000-0000-4000-8000-000000000000", deps, { ...env, PORTAL_ENABLE_GENERATION: "false" })).status).toBe(503);
    expect((await advanceHandler("00000000-0000-4000-8000-000000000000", deps, env)).status).toBe(404);
  });
});

describe("GET /api/cron/cleanup", () => {
  it("needs the bearer secret and deletes jobs older than 7 days", async () => {
    let now = new Date("2026-11-01T00:00:00Z");
    const store = memoryStore(() => now);
    const { id } = await (await createJobHandler(valid(), store, env, now)).json();
    now = new Date("2026-11-11T00:00:00Z");
    const { id: fresh } = await (await createJobHandler(valid(), store, env, now)).json();
    const unauthorised = new Request("http://x/api/cron/cleanup", { headers: { authorization: "Bearer wrong" } });
    expect((await cleanupHandler(unauthorised, store, env, now)).status).toBe(401);
    const request = new Request("http://x/api/cron/cleanup", { headers: { authorization: `Bearer ${env.CRON_SECRET}` } });
    const result = await (await cleanupHandler(request, store, env, now)).json();
    expect(result).toEqual({ deletedJobs: 1, deletedMarkers: 1 });
    expect((await store.list(`jobs/${id}/`)).length).toBe(0);
    expect((await store.list(`jobs/${fresh}/`)).length).toBeGreaterThan(0);
  });
});
