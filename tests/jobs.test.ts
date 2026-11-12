import { describe, expect, it } from "vitest";
import { cannedModel, fakeModel, type Brief, type Material, type ModelClient } from "@core/generate/index";
import { BudgetExceeded } from "@core/generate/index";
import { advance, createJob, errorCode, nextStep, readState, type JobState } from "@/lib/jobs/steps";
import { claimStep, CLAIM_TTL_SECONDS } from "@/lib/jobs/claim";
import { jobKey } from "@/lib/jobs/state";
import { memoryStore } from "@/lib/jobs/store";
import { findCourseByOwnerToken, readMeta } from "@/lib/sites/store";

const brief: Brief = { language: "en", level: "university", depth: "cram", examMode: true, quizzes: true, widgets: true, context: "" };
const materials: Material[] = [
  { name: "a.txt", pages: [{ n: 1, text: "Energy is conserved. ".repeat(20) }] },
  { name: "b.txt", pages: [{ n: 1, text: "Kinetic energy is half m v squared. ".repeat(20) }] },
];

function setup(model: ModelClient = cannedModel(), start = new Date("2026-11-11T10:00:00Z")) {
  let clock = start.getTime();
  const now = () => new Date(clock);
  const store = memoryStore(now);
  return { store, now, tick: (seconds: number) => (clock += seconds * 1000), deps: { store, model, now } };
}

async function run(id: string, deps: Parameters<typeof advance>[1], times = 20): Promise<JobState> {
  let state = await advance(id, deps);
  for (let i = 0; i < times && state.status === "idle"; i += 1) state = await advance(id, deps);
  return state;
}

function base(step: JobState["step"], extra: Partial<JobState> = {}): JobState {
  return { id: "x", step, status: "idle", lecturesTotal: 3, lecturesDone: 0, attempts: 0, usage: { inputTokens: 0, outputTokens: 0, calls: 0 }, createdAt: "", updatedAt: "", ...extra };
}

describe("nextStep", () => {
  it("walks plan → review → lectures → finish → done", () => {
    expect(nextStep(base("plan"))).toBe("review");
    expect(nextStep(base("review"))).toBe("lecture:1");
    expect(nextStep(base("lecture:2"))).toBe("lecture:3");
    expect(nextStep(base("lecture:3"))).toBe("finish");
    expect(nextStep(base("finish"))).toBe("done");
  });
});

describe("claimStep", () => {
  it("is granted once per step and attempt", async () => {
    const { store, now } = setup();
    expect(await claimStep(store, "00000000-0000-4000-8000-000000000000", "plan", 0, now())).toBe(true);
    expect(await claimStep(store, "00000000-0000-4000-8000-000000000000", "plan", 0, now())).toBe(false);
    expect(await claimStep(store, "00000000-0000-4000-8000-000000000000", "plan", 1, now())).toBe(true);
  });
});

describe("advance", () => {
  it("happy path: plan → review → lectures → finish → done, published with an owner link", async () => {
    const { store, deps } = setup();
    const { id } = await createJob(store, { brief, materials }, deps.now());
    let state = await advance(id, deps);
    expect(state).toMatchObject({ status: "awaiting-review", step: "review", lecturesTotal: 2 });
    expect(await advance(id, deps)).toEqual(state); // review waits for the user
    await store.write(jobKey(id, "state.json"), JSON.stringify({ ...state, step: "lecture:1", status: "idle" }));
    state = await advance(id, deps);
    expect(state).toMatchObject({ step: "lecture:2", lecturesDone: 1, status: "idle" });
    state = await run(id, deps);
    expect(state).toMatchObject({ step: "done", status: "done", lecturesDone: 2 });
    expect(state.usage.calls).toBeGreaterThan(2);
    expect(await store.read(jobKey(id, "materials.json"))).toBeNull();
    expect(await store.read(jobKey(id, "bundle.json"))).toBeNull();

    const site = /^\/courses\/([a-z0-9][a-z0-9-]*-[0-9a-f]{8})\/$/.exec(state.siteUrl ?? "");
    expect(site).not.toBeNull();
    const key = site![1];

    const owner = /^\/manage\/([A-Za-z0-9_-]{32})$/.exec(state.manageUrl ?? "");
    expect(owner).not.toBeNull();
    const token = owner![1];
    expect(await findCourseByOwnerToken(store, token)).toBe(key);

    // The token lives only in the job state: never in a course file or a storage key.
    for (const [storedKey, stored] of store.data) {
      if (storedKey === jobKey(id, "state.json")) continue;
      expect(storedKey).not.toContain(token);
      expect(stored.body).not.toContain(token);
    }

    const meta = await readMeta(store, key);
    expect(meta).toMatchObject({ formatVersion: 1, lectures: 2 });
    expect(meta?.usage.calls).toBeGreaterThan(0);
  });

  it("does not call the model while a fresh claim exists", async () => {
    let calls = 0;
    const model = fakeModel(() => {
      calls += 1;
      return "{}";
    });
    const { store, deps } = setup(model);
    const { id } = await createJob(store, { brief, materials }, deps.now());
    await claimStep(store, id, "plan", 0, deps.now());
    const state = await advance(id, deps);
    expect(state.status).toBe("working");
    expect(calls).toBe(0);
  });

  it("a stale claim increases attempts; the third failure fails the job", async () => {
    const { store, deps, tick } = setup();
    const { id } = await createJob(store, { brief, materials }, deps.now());
    await claimStep(store, id, "plan", 0, deps.now());
    tick(CLAIM_TTL_SECONDS + 1);
    expect((await advance(id, deps)).attempts).toBe(1);
    await claimStep(store, id, "plan", 1, deps.now());
    tick(CLAIM_TTL_SECONDS + 1);
    expect((await advance(id, deps)).attempts).toBe(2);
    await claimStep(store, id, "plan", 2, deps.now());
    tick(CLAIM_TTL_SECONDS + 1);
    const state = await advance(id, deps);
    expect(state).toMatchObject({ status: "failed", error: "step-failed" });
  });

  it("three thrown errors fail the job with a short safe message", async () => {
    const model: ModelClient = { complete: async () => { throw new Error("HTTP 500 from provider with key=SECRET and a long body"); } };
    const { store, deps } = setup(model);
    const { id } = await createJob(store, { brief, materials }, deps.now());
    let state = await advance(id, deps);
    expect(state).toMatchObject({ status: "idle", attempts: 1, error: "step-failed" });
    expect(state.error).not.toContain("SECRET");
    state = await advance(id, deps);
    state = await advance(id, deps);
    expect(state.status).toBe("failed");
  });

  it("fails with a plain message when the budget is used up", async () => {
    const { store, deps } = setup();
    const { id } = await createJob(store, { brief, materials }, deps.now());
    const state = await readState(store, id);
    await store.write(jobKey(id, "state.json"), JSON.stringify({ ...state, usage: { inputTokens: 600_000, outputTokens: 0, calls: 99 } }));
    expect(await advance(id, deps)).toMatchObject({ status: "failed", error: "course-too-big" });
  });

  it("publishes an old publish-wait job when it is advanced", async () => {
    const { store, deps } = setup();
    const { id } = await createJob(store, { brief, materials }, deps.now());
    let state = await advance(id, deps);
    await store.write(jobKey(id, "state.json"), JSON.stringify({ ...state, step: "lecture:1", status: "idle" }));
    state = await advance(id, deps);
    state = await advance(id, deps);
    expect(state.step).toBe("finish");
    await store.write(jobKey(id, "state.json"), JSON.stringify({ ...state, step: "publish-wait", status: "idle" }));

    const done = await advance(id, deps);
    expect(done).toMatchObject({ step: "done", status: "done" });
    expect(done.siteUrl).toMatch(/^\/courses\/.+\/$/);
    expect(done.manageUrl).toMatch(/^\/manage\/[A-Za-z0-9_-]{32}$/);
  });
});

describe("errorCode", () => {
  it("maps every known failure to a stable code", () => {
    expect(errorCode(new BudgetExceeded())).toBe("course-too-big");
    expect(errorCode(new Error("The course plan was invalid twice: course.title: Required"))).toBe("plan-failed");
    expect(errorCode(new Error("lecture produced no valid content"))).toBe("lecture-failed");
    expect(errorCode(new Error("The lecture reply was not JSON twice."))).toBe("lecture-failed");
    expect(errorCode(new Error("Gemini request failed (HTTP 503)."))).toBe("busy");
    expect(errorCode(new Error("Model request failed."))).toBe("busy");
    expect(errorCode(new Error("The uploaded material is no longer available."))).toBe("material-gone");
    expect(errorCode(new Error("anything else"))).toBe("step-failed");
    expect(errorCode("not an error")).toBe("step-failed");
  });

  it("a job whose material is gone fails with material-gone and no sentence", async () => {
    const { store, deps } = setup();
    const { id } = await createJob(store, { brief, materials }, deps.now());
    await store.delete([jobKey(id, "materials.json")]);
    const state = await advance(id, deps);
    expect(state).toMatchObject({ status: "idle", attempts: 1, error: "material-gone" });
    await advance(id, deps);
    expect(await advance(id, deps)).toMatchObject({ status: "failed", error: "material-gone" });
  });
});
