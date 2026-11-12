import { randomUUID } from "node:crypto";
import {
  Budget,
  BudgetExceeded,
  briefSchema,
  coursePlanSchema,
  DEFAULT_BUDGET,
  finishCourse,
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
import { logEvent, logMessage } from "@/lib/log";
import { publishCourse } from "@/lib/sites/publish";
import { courseKeyFor } from "@/lib/sites/store";
import { claimAge, claimStep, CLAIM_TTL_SECONDS } from "./claim";
import { jobKey, lectureNumber, type JobState, type Step } from "./state";
import type { Store } from "./store";

export type { JobState, Step } from "./state";

export const MAX_ATTEMPTS = 3;

export interface AdvanceDeps {
  store: Store;
  model: ModelClient;
  now: () => Date;
}

/** The step after the current one. Pure. */
export function nextStep(state: JobState): Step {
  const lecture = lectureNumber(state.step);
  if (lecture !== null) return lecture < state.lecturesTotal ? `lecture:${lecture + 1}` : "finish";
  switch (state.step) {
    case "plan":
      return "review";
    case "review":
      return state.lecturesTotal > 0 ? "lecture:1" : "finish";
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

export async function createJob(store: Store, input: { brief: Brief; materials: Material[]; codeId?: string }, now: Date): Promise<{ id: string; state: JobState }> {
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
    ...(input.codeId ? { codeId: input.codeId } : {}),
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

/** A stable code for a failed step. Users never see providers, models or token counts; details stay in the logs. */
export function errorCode(error: unknown): string {
  if (error instanceof BudgetExceeded) return "course-too-big";
  const message = error instanceof Error ? error.message : "";
  if (/^The course plan was invalid twice/.test(message)) return "plan-failed";
  if (message === "lecture produced no valid content" || /^The lecture reply was not JSON/.test(message)) return "lecture-failed";
  if (/^(Gemini|Model) request failed( \(HTTP \d+\))?\.$/.test(message)) return "busy";
  if (message === "The uploaded material is no longer available.") return "material-gone";
  return "step-failed";
}

/** Run exactly one step. Returns the state to save. */
async function runStep(state: JobState, deps: AdvanceDeps, model: ModelClient): Promise<JobState> {
  const { store } = deps;
  const moveOn = (next: Partial<JobState>): JobState => {
    const moved = { ...state, ...next, attempts: 0, error: undefined };
    return { ...moved, step: nextStep({ ...state, ...next }), status: "idle" };
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
    const published = await publishCourse(store, {
      key: courseKeyFor(plan.course.id, state.id),
      files,
      jobId: state.id,
      usage: state.usage,
      now: deps.now(),
    });
    await store.delete([jobKey(state.id, "materials.json")]);
    return { ...state, ...published, step: "done", status: "done", attempts: 0, error: undefined };
  }

  // review is left by the outline route; done has nothing to do.
  return state;
}

/** Steps written by older versions of the portal; they now finish in one go. */
const LEGACY_PUBLISH_STEPS = new Set<string>(["publish", "publish-wait"]);

/** Advance a job by at most one step. Safe to call repeatedly and concurrently. */
export async function advance(id: string, deps: AdvanceDeps): Promise<JobState> {
  const { store } = deps;
  const loaded = await readState(store, id);
  if (!loaded) throw new Error("Job not found.");
  const state: JobState = LEGACY_PUBLISH_STEPS.has(loaded.step) ? { ...loaded, step: "finish", attempts: 0 } : loaded;
  if (state.status === "awaiting-review" || state.status === "done" || state.status === "failed" || state.step === "review" || state.step === "done") {
    return state;
  }
  const now = deps.now();

  if (!(await claimStep(store, id, state.step, state.attempts, now))) {
    const age = await claimAge(store, id, state.step, state.attempts, now);
    if (age !== null && age < CLAIM_TTL_SECONDS) return { ...state, status: "working" };
    const attempts = state.attempts + 1;
    if (attempts >= MAX_ATTEMPTS) {
      const failed: JobState = { ...state, attempts, status: "failed", error: "step-failed" };
      logEvent("job.failed", { jobId: id, step: state.step, code: failed.error });
      return saveState(store, failed, now);
    }
    return saveState(store, { ...state, attempts, status: "idle" }, now);
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
  const stepFields = () => ({
    jobId: id,
    step: state.step,
    calls: budget.used.calls,
    inputTokens: budget.used.inputTokens,
    outputTokens: budget.used.outputTokens,
  });

  const started = Date.now();
  await saveState(store, { ...state, status: "working" }, now);
  try {
    const next = await runStep(state, deps, model);
    logEvent("job.step", { ...stepFields(), ok: true, ms: Date.now() - started });
    return saveState(store, addUsage(next), deps.now());
  } catch (error) {
    const code = errorCode(error);
    logEvent("job.step", { ...stepFields(), ok: false, ms: Date.now() - started, error: logMessage(error) });
    if (error instanceof BudgetExceeded) {
      const failed: JobState = { ...state, status: "failed", error: code };
      logEvent("job.failed", { jobId: id, step: state.step, code: failed.error });
      return saveState(store, addUsage(failed), deps.now());
    }
    const attempts = state.attempts + 1;
    const gaveUp = attempts >= MAX_ATTEMPTS;
    const next: JobState = {
      ...state,
      attempts,
      status: gaveUp ? "failed" : "idle",
      error: code,
    };
    if (gaveUp) logEvent("job.failed", { jobId: id, step: state.step, code: next.error });
    return saveState(store, addUsage(next), deps.now());
  }
}
