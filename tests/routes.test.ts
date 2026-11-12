import { describe, expect, it } from "vitest";
import { cannedModel, type Brief } from "@core/generate/index";
import { siteDataSchema } from "@core/site";
import { advanceHandler, advanceJob, cleanupHandler, createJobHandler, getJobHandler, MAX_BODY_BYTES, designHandler, shouldChain } from "@/lib/api/handlers";
import { jobKey } from "@/lib/jobs/state";
import { memoryStore } from "@/lib/jobs/store";
import { readSite } from "@/lib/sites/store";

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
    expect((await designHandler(id, new Request("http://x", { method: "PUT", body: "{}" }), store)).status).toBe(409);

    let state = await (await advanceHandler(id, deps, env)).json();
    expect(state.status).toBe("awaiting-review");
    const job = await (await getJobHandler(id, store)).json();
    expect(job.design.options[0].lectures).toHaveLength(2);
    expect(JSON.stringify(job)).not.toContain("Plants make glucose");

    const keep = [job.design.options[0].lectures[1].slug];
    expect((await designHandler(id, new Request("http://x", { method: "PUT", body: JSON.stringify({ keep: [], titles: {} }) }), store)).status).toBe(400);
    expect((await designHandler(id, new Request("http://x", { method: "PUT", body: JSON.stringify({ keep: ["nope"], titles: {} }) }), store)).status).toBe(400);
    const outlined = await designHandler(id, new Request("http://x", { method: "PUT", body: JSON.stringify({ keep, titles: { [keep[0]]: "Renamed" } }) }), store);
    expect(outlined.status).toBe(200);
    expect((await outlined.json()).lecturesTotal).toBe(1);

    for (let i = 0; i < 10 && state.status !== "done"; i += 1) state = await (await advanceHandler(id, deps, env)).json();
    expect(state).toMatchObject({ status: "done", lecturesDone: 1 });
    // Learners and authors never see usage, models, invite codes or internal files.
    for (const body of [state, await (await getJobHandler(id, store)).json()]) {
      expect(Object.keys(body)).not.toContain("usage");
      expect(Object.keys(body)).not.toContain("codeId");
      expect(JSON.stringify(body)).not.toMatch(/token|model|gemini/i);
    }

    const match = /^\/courses\/([^/]+)\/$/.exec(state.siteUrl ?? "");
    expect(match).not.toBeNull();
    const site = await readSite(store, match![1]);
    expect(site).not.toBeNull();
    expect(siteDataSchema.safeParse(site).success).toBe(true);
    expect(site?.lectures).toHaveLength(1);
    expect(site?.lectures[0]?.meta.title).toBe("Renamed");
    expect(await store.read(jobKey(id, "bundle.json"))).toBeNull();
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

describe("error codes", () => {
  const unknownId = "00000000-0000-4000-8000-000000000000";

  async function read(response: Response): Promise<{ error: string; code: string }> {
    return (await response.json()) as { error: string; code: string };
  }

  it("generation-off → 503", async () => {
    const response = await createJobHandler(valid(), memoryStore(), { ...env, PORTAL_ENABLE_GENERATION: "false" });
    expect(response.status).toBe(503);
    expect(await read(response)).toMatchObject({ code: "generation-off" });
  });

  it("too-large → 413", async () => {
    const big = post({ accessCode: CODE, brief, materials: [{ name: "a.txt", pages: [{ n: 1, text: "x".repeat(MAX_BODY_BYTES) }] }] });
    const response = await createJobHandler(big, memoryStore(), env);
    expect(response.status).toBe(413);
    expect(await read(response)).toMatchObject({ code: "too-large" });
  });

  it("bad-request → 400 for not JSON, wrong shape, unknown language and invalid options", async () => {
    expect(await read(await createJobHandler(post("{not json"), memoryStore(), env))).toMatchObject({ code: "bad-request" });
    expect(await read(await createJobHandler(post({}), memoryStore(), env))).toMatchObject({ code: "bad-request" });
    expect(await read(await createJobHandler(post({ accessCode: CODE, brief: { ...brief, language: "xx" }, materials }), memoryStore(), env))).toMatchObject({ code: "bad-request" });
    expect(await read(await createJobHandler(post({ accessCode: CODE, brief: { ...brief, depth: "nope" }, materials }), memoryStore(), env))).toMatchObject({ code: "bad-request" });
  });

  it("wrong-code → 401", async () => {
    const response = await createJobHandler(post({ accessCode: "nope", brief, materials }), memoryStore(), env);
    expect(response.status).toBe(401);
    expect(await read(response)).toMatchObject({ code: "wrong-code" });
  });

  it("daily-limit → 429", async () => {
    const store = memoryStore();
    await createJobHandler(valid(), store, env);
    await createJobHandler(valid(), store, env);
    const response = await createJobHandler(valid(), store, env);
    expect(response.status).toBe(429);
    expect(await read(response)).toMatchObject({ code: "daily-limit" });
  });

  it("material codes → 400 (empty, too-many-files, too-many-pages, too-long, scanned)", async () => {
    const empty = post({ accessCode: CODE, brief, materials: [] });
    expect(await read(await createJobHandler(empty, memoryStore(), env))).toMatchObject({ code: "empty" });

    const manyFiles = Array.from({ length: 13 }, (_, i) => ({ name: `f${i}.txt`, pages: [{ n: 1, text: "word ".repeat(20) }] }));
    expect(await read(await createJobHandler(post({ accessCode: CODE, brief, materials: manyFiles }), memoryStore(), env))).toMatchObject({ code: "too-many-files" });

    const manyPages = Array.from({ length: 3 }, (_, i) => ({ name: `p${i}.txt`, pages: Array.from({ length: 150 }, (_, j) => ({ n: j + 1, text: "word ".repeat(10) })) }));
    expect(await read(await createJobHandler(post({ accessCode: CODE, brief, materials: manyPages }), memoryStore(), env))).toMatchObject({ code: "too-many-pages" });

    const tooLong = [{ name: "a.txt", pages: [{ n: 1, text: "x".repeat(600_001) }] }];
    expect(await read(await createJobHandler(post({ accessCode: CODE, brief, materials: tooLong }), memoryStore(), env))).toMatchObject({ code: "too-long" });

    const scanned = [{ name: "s.pdf", pages: [{ n: 1, text: "1" }, { n: 2, text: "" }] }];
    expect(await read(await createJobHandler(post({ accessCode: CODE, brief, materials: scanned }), memoryStore(), env))).toMatchObject({ code: "scanned" });
  });

  it("bad-id → 400 and not-found → 404", async () => {
    expect(await read(await getJobHandler("../x", memoryStore()))).toMatchObject({ code: "bad-id" });
    expect((await getJobHandler("../x", memoryStore())).status).toBe(400);
    expect(await read(await getJobHandler(unknownId, memoryStore()))).toMatchObject({ code: "not-found" });
    expect((await getJobHandler(unknownId, memoryStore())).status).toBe(404);
  });

  it("wrong-state → 409", async () => {
    const store = memoryStore();
    const { id } = await (await createJobHandler(valid(), store, env)).json();
    const response = await designHandler(id, new Request("http://x", { method: "PUT", body: "{}" }), store);
    expect(response.status).toBe(409);
    expect(await read(response)).toMatchObject({ code: "wrong-state" });
  });

  it("bad-outline → 400 for no lecture kept, unknown slug and a long title", async () => {
    const store = memoryStore();
    const { id } = await (await createJobHandler(valid(), store, env)).json();
    await advanceHandler(id, () => ({ store, model: cannedModel(), now: () => new Date() }), env);
    const put = (body: unknown) => designHandler(id, new Request("http://x", { method: "PUT", body: JSON.stringify(body) }), store);
    expect(await read(await put({ keep: [], titles: {} }))).toMatchObject({ code: "bad-design" });
    expect(await read(await put({ keep: ["nope"], titles: {} }))).toMatchObject({ code: "bad-design" });
    expect(await read(await put({ keep: ["nope"], titles: { nope: "x".repeat(121) } }))).toMatchObject({ code: "bad-design" });
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

describe("advanceJob and shouldChain", () => {
  const unknownId = "00000000-0000-4000-8000-000000000000";

  it("shouldChain is true only for an idle job without an error", () => {
    expect(shouldChain({ status: "idle" })).toBe(true);
    expect(shouldChain({ status: "idle", error: "busy" })).toBe(false);
    for (const status of ["working", "awaiting-review", "done", "failed"] as const) {
      expect(shouldChain({ status })).toBe(false);
    }
  });

  it("advanceJob returns the new state for a normal step", async () => {
    const store = memoryStore();
    const deps = () => ({ store, model: cannedModel(), now: () => new Date() });
    const { id } = await (await createJobHandler(valid(), store, env)).json();
    const { response, state } = await advanceJob(id, deps, env);
    expect(response.status).toBe(200);
    expect(state).toMatchObject({ id, status: "awaiting-review" });
  });

  it("advanceJob returns a null state for an unknown id and when generation is off", async () => {
    const store = memoryStore();
    const deps = () => ({ store, model: cannedModel(), now: () => new Date() });
    expect((await advanceJob("not-an-id", deps, env)).state).toBeNull();
    expect((await advanceJob(unknownId, deps, env)).state).toBeNull();

    const { id } = await (await createJobHandler(valid(), store, env)).json();
    const off = { ...env, PORTAL_ENABLE_GENERATION: "false" } as unknown as NodeJS.ProcessEnv;
    expect((await advanceJob(id, deps, off)).state).toBeNull();
  });
});
