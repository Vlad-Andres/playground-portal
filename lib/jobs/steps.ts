import { randomUUID } from "node:crypto";
import {
  Budget,
  BudgetExceeded,
  briefSchema,
  coursePlanSchema,
  DEFAULT_BUDGET,
  finishCourse,
  makeBundle,
  materialSchema,
  planCourse,
  withBudget,
  writeLecture,
  type Brief,
  type CoursePlan,
  type Material,
  type ModelClient,
} from "@core/generate/index";
import { lectureFileSchema, type LectureFile } from "@core/schema";
import type { Publisher } from "@/lib/publish/types";
import { repoNameFor } from "@/lib/publish/names";
import { claimAge, claimKey, claimStep, CLAIM_TTL_SECONDS } from "./claim";
import { jobKey, lectureNumber, type JobState, type Step } from "./state";
import type { Store } from "./store";

export type { JobState, Step } from "./state";

export const MAX_ATTEMPTS = 3;

export interface AdvanceDeps {
  store: Store;
  model: ModelClient;
  now: () => Date;
  publish?: Publisher;
}

/** The step after the current one. Pure. */
export function nextStep(state: JobState, publishConfigured: boolean): Step {
  const lecture = lectureNumber(state.step);
  if (lecture !== null) return lecture < state.lecturesTotal ? `lecture:${lecture + 1}` : "finish";
  switch (state.step) {
    case "plan":
      return "review";
    case "review":
      return state.lecturesTotal > 0 ? "lecture:1" : "finish";
    case "finish":
      return publishConfigured ? "publish" : "done";
    case "publish":
      return "publish-wait";
    default:
      return "done";
  }
}

async function readJson<T>(store: Store, key: string): Promise<T | null> {
  const body = await store.read(key);
  if (body === null) return null;
  return JSON.parse(body) as T;
}

async function writeJson(store: Store, key: string, value: unknown): Promise<void> {
  await store.write(key, `${JSON.stringify(value)}\n`);
}

export async function readState(store: Store, id: string): Promise<JobState | null> {
  return readJson<JobState>(store, jobKey(id, "state.json"));
}

async function saveState(store: Store, state: JobState, now: Date): Promise<JobState> {
  const next = { ...state, updatedAt: now.toISOString() };
  await writeJson(store, jobKey(state.id, "state.json"), next);
  return next;
}

export async function createJob(store: Store, input: { brief: Brief; materials: Material[] }, now: Date): Promise<{ id: string; state: JobState }> {
  const id = randomUUID();
  await writeJson(store, jobKey(id, "brief.json"), input.brief);
  await writeJson(store, jobKey(id, "materials.json"), input.materials);
  const state: JobState = {
    id,
    step: "plan",
    status: "idle",
    lecturesTotal: 0,
    lecturesDone: 0,
    attempts: 0,
    bundleReady: false,
    usage: { inputTokens: 0, outputTokens: 0, calls: 0 },
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
  await writeJson(store, jobKey(id, "state.json"), state);
  return { id, state };
}

async function loadBrief(store: Store, id: string): Promise<Brief> {
  return briefSchema.parse(await readJson(store, jobKey(id, "brief.json")));
}

async function loadMaterials(store: Store, id: string): Promise<Material[]> {
  const raw = await readJson<unknown[]>(store, jobKey(id, "materials.json"));
  if (!raw) throw new Error("The uploaded material is no longer available.");
  return raw.map((material) => materialSchema.parse(material));
}

export async function loadPlan(store: Store, id: string): Promise<CoursePlan> {
  const plan = coursePlanSchema.safeParse(await readJson(store, jobKey(id, "plan.json")));
  if (!plan.success) throw new Error("The course plan is missing.");
  return plan.data;
}

/** Short, user-safe text for an error (never a provider body or a key). */
function safeMessage(error: unknown): string {
  if (error instanceof BudgetExceeded) return "Generation budget reached.";
  const message = error instanceof Error ? error.message : "";
  if (/^The course plan was invalid twice/.test(message)) return "The model returned an invalid course plan.";
  if (message === "lecture produced no valid content") return "The model returned no usable content for this lecture.";
  if (/^The lecture reply was not JSON/.test(message)) return "The model did not return JSON for this lecture.";
  if (/^(Gemini|Model) request failed( \(HTTP \d+\))?\.$/.test(message)) return message;
  if (message === "The uploaded material is no longer available.") return message;
  return "This step failed.";
}

/** Run exactly one step. Returns the state to save. */
async function runStep(state: JobState, deps: AdvanceDeps, model: ModelClient): Promise<JobState> {
  const { store } = deps;
  const publishConfigured = Boolean(deps.publish);
  const moveOn = (next: Partial<JobState>): JobState => {
    const moved = { ...state, ...next, attempts: 0, error: undefined };
    return { ...moved, step: nextStep({ ...state, ...next }, publishConfigured), status: "idle" };
  };

  if (state.step === "plan") {
    const [brief, materials] = await Promise.all([loadBrief(store, state.id), loadMaterials(store, state.id)]);
    const plan = await planCourse(materials, brief, model);
    await writeJson(store, jobKey(state.id, "plan.json"), plan);
    return { ...moveOn({ lecturesTotal: plan.lectures.length }), status: "awaiting-review" };
  }

  const lecture = lectureNumber(state.step);
  if (lecture !== null) {
    const [brief, materials, plan] = await Promise.all([loadBrief(store, state.id), loadMaterials(store, state.id), loadPlan(store, state.id)]);
    const { lecture: file, dropped } = await writeLecture(plan, lecture - 1, materials, brief, model);
    await writeJson(store, jobKey(state.id, `lectures/${lecture}.json`), { lecture: file, dropped: dropped.length });
    return moveOn({ lecturesDone: lecture });
  }

  if (state.step === "finish") {
    const [brief, plan] = await Promise.all([loadBrief(store, state.id), loadPlan(store, state.id)]);
    const lectures: LectureFile[] = [];
    for (let n = 1; n <= plan.lectures.length; n += 1) {
      const saved = await readJson<{ lecture: unknown }>(store, jobKey(state.id, `lectures/${n}.json`));
      lectures.push(lectureFileSchema.parse(saved?.lecture));
    }
    const { files, problems } = finishCourse(plan, lectures, brief);
    if (problems.some((problem) => problem.severity === "error")) throw new Error("The finished course did not validate.");
    await writeJson(store, jobKey(state.id, "bundle.json"), makeBundle(files));
    await store.delete([jobKey(state.id, "materials.json")]);
    const finished = moveOn({ bundleReady: true });
    return finished.step === "done" ? { ...finished, status: "done" } : finished;
  }

  if (state.step === "publish" && deps.publish) {
    const bundle = await readJson<{ files: Record<string, string> }>(store, jobKey(state.id, "bundle.json"));
    const plan = await loadPlan(store, state.id);
    if (!bundle) throw new Error("The course bundle is missing.");
    const published = await deps.publish.start({ repoName: repoNameFor(plan.course.id, state.id), files: bundle.files });
    await writeJson(store, jobKey(state.id, "publish.json"), published);
    return moveOn({});
  }

  if (state.step === "publish-wait" && deps.publish) {
    const published = await readJson<{ repo: string; commitSha: string }>(store, jobKey(state.id, "publish.json"));
    if (!published) throw new Error("Publishing was not started.");
    const result = await deps.publish.check(published);
    if (result.state === "building") return { ...state, status: "idle", error: undefined };
    if (result.state === "failed") throw new Error("Publishing failed.");
    return { ...moveOn({ siteUrl: result.siteUrl }), status: "done" };
  }

  // review is left by the outline route; done has nothing to do.
  return state;
}

/** Advance a job by at most one step. Safe to call repeatedly and concurrently. */
export async function advance(id: string, deps: AdvanceDeps): Promise<JobState> {
  const { store } = deps;
  const state = await readState(store, id);
  if (!state) throw new Error("Job not found.");
  if (state.status === "awaiting-review" || state.status === "done" || state.status === "failed" || state.step === "review" || state.step === "done") {
    return state;
  }
  const now = deps.now();

  if (!(await claimStep(store, id, state.step, state.attempts, now))) {
    const age = await claimAge(store, id, state.step, state.attempts, now);
    if (age !== null && age < CLAIM_TTL_SECONDS) return { ...state, status: "working" };
    const attempts = state.attempts + 1;
    return saveState(
      store,
      attempts >= MAX_ATTEMPTS ? { ...state, attempts, status: "failed", error: "This step failed three times." } : { ...state, attempts, status: "idle" },
      now,
    );
  }

  const budget = new Budget({
    inputTokens: Math.max(0, DEFAULT_BUDGET.inputTokens - state.usage.inputTokens),
    outputTokens: Math.max(0, DEFAULT_BUDGET.outputTokens - state.usage.outputTokens),
  });
  const model = withBudget(deps.model, budget);
  const addUsage = (target: JobState): JobState => ({
    ...target,
    usage: {
      inputTokens: state.usage.inputTokens + budget.used.inputTokens,
      outputTokens: state.usage.outputTokens + budget.used.outputTokens,
      calls: state.usage.calls + budget.used.calls,
    },
  });

  await saveState(store, { ...state, status: "working" }, now);
  try {
    const next = await runStep(state, deps, model);
    // A step that stays in place (publish-wait while building) releases its claim for the next poll.
    if (next.step === state.step && next.status === "idle") await store.delete([claimKey(id, state.step, state.attempts)]);
    return saveState(store, addUsage(next), deps.now());
  } catch (error) {
    const message = safeMessage(error);
    if (error instanceof BudgetExceeded) return saveState(store, addUsage({ ...state, status: "failed", error: message }), deps.now());
    const attempts = state.attempts + 1;
    return saveState(
      store,
      addUsage({ ...state, attempts, status: attempts >= MAX_ATTEMPTS ? "failed" : "idle", error: attempts >= MAX_ATTEMPTS ? `${message} It failed three times.` : message }),
      deps.now(),
    );
  }
}
