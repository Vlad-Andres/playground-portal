import { randomUUID } from "node:crypto";
import {
  Budget,
  BudgetExceeded,
  briefSchema,
  coursePlanSchema,
  answerContext,
  courseContextSchema,
  courseDesignSchema,
  DEFAULT_BUDGET,
  defaultContext,
  designCourse,
  designOutlineSchema,
  expandOutline,
  finishCourse,
  inferContext,
  LIMITS,
  planAppend,
  planRefinement,
  renderMaterials,
  rewriteLecture,
  requestSchema,
  resolveBrief,
  materialSchema,
  withBudget,
  writeLecture,
  type Brief,
  type CourseContext,
  type CourseDesign,
  type CoursePlan,
  type CourseRequest,
  type DesignOutline,
  type Material,
  type ModelClient,
} from "@core/generate/index";
import { lectureFileSchema, type LectureFile } from "@core/schema";
import { appendLectures, replaceLectures, toLectureFile } from "@core/site";
import { logEvent, logMessage } from "@/lib/log";
import { addSources, deleteSources, readBrief, readSources, releaseBusy, releaseRound, saveBrief, updateCourse } from "@/lib/sites/library";
import { publishCourse, siteFromFiles } from "@/lib/sites/publish";
import { readMeta, readSite } from "@/lib/sites/store";
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
  /** Called after a published course changed, so its cached pages are refreshed. */
  onCourseChanged?: (key: string) => void;
}

/** The step after the current one. Pure. */
export function nextStep(state: JobState): Step {
  const lecture = lectureNumber(state.step);
  if (lecture !== null) return lecture < state.lecturesTotal ? `lecture:${lecture + 1}` : "finish";
  switch (state.step) {
    case "plan":
    case "design":
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

/**
 * A new create job. With a `request` it starts by inferring the context; with an already decided `brief`
 * (tests, older callers) it goes straight to the design.
 */
export async function createJob(
  store: Store,
  input: ({ request: CourseRequest; brief?: undefined } | { brief: Brief; request?: undefined }) & { materials: Material[]; codeId?: string; ownerId?: string; keepSources?: boolean },
  now: Date,
): Promise<{ id: string; state: JobState }> {
  const id = randomUUID();
  if (input.request) await writeJson(store, jobKey(id, "request.json"), input.request);
  else await writeJson(store, jobKey(id, "brief.json"), input.brief);
  await writeJson(store, jobKey(id, "materials.json"), input.materials);
  const state: JobState = {
    id,
    kind: "create",
    step: input.request ? "context" : "design",
    status: "idle",
    lecturesTotal: 0,
    lecturesDone: 0,
    attempts: 0,
    ...(input.codeId ? { codeId: input.codeId } : {}),
    ...(input.ownerId ? { ownerId: input.ownerId } : {}),
    ...(input.keepSources ? { keepSources: true } : {}),
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

export async function loadRequest(store: Store, id: string): Promise<CourseRequest> {
  return requestSchema.parse(await readJson(store, jobKey(id, "request.json")));
}

/** The inferred context, or a neutral one built from the brief for jobs that have none. */
export async function loadContext(store: Store, id: string, brief?: Brief): Promise<CourseContext> {
  const parsed = courseContextSchema.safeParse(await readJson(store, jobKey(id, "context.json")));
  if (parsed.success) return parsed.data;
  const fallback = brief ?? (await loadBrief(store, id));
  return defaultContext(fallback, fallback.title ?? "");
}

/** The design, or the plan alone as the recommendation for jobs designed before alternatives existed. */
export async function loadDesign(store: Store, id: string): Promise<CourseDesign> {
  const parsed = courseDesignSchema.safeParse(await readJson(store, jobKey(id, "design.json")));
  if (parsed.success) return parsed.data;
  return { recommended: await loadPlan(store, id), alternatives: [] };
}

export async function loadOutline(store: Store, id: string): Promise<DesignOutline> {
  return designOutlineSchema.parse(await readJson(store, jobKey(id, "outline.json")));
}

export async function writeJobFile(store: Store, id: string, file: string, value: unknown): Promise<void> {
  await writeJson(store, jobKey(id, file), value);
}

export async function saveJobState(store: Store, state: JobState, now: Date): Promise<JobState> {
  return saveState(store, state, now);
}

export { answerContext, resolveBrief };
export { defaultContext as defaultContextFor };

/** Start a job that changes an existing course. Access, limits and locks are checked by the caller. */
export async function createCourseJob(
  store: Store,
  input: { kind: "refine" | "append"; courseKey: string; ownerId: string; round?: number; note?: string; materials?: Material[] },
  now: Date,
  id: string = randomUUID(),
): Promise<JobState> {
  if (input.note !== undefined) await writeJson(store, jobKey(id, "note.json"), { note: input.note });
  if (input.materials) await writeJson(store, jobKey(id, "materials.json"), input.materials);
  const state: JobState = {
    id,
    kind: input.kind,
    step: input.kind === "refine" ? "refine-plan" : "append-plan",
    status: "idle",
    courseKey: input.courseKey,
    ownerId: input.ownerId,
    ...(input.round ? { round: input.round } : {}),
    lecturesTotal: 0,
    lecturesDone: 0,
    attempts: 0,
    usage: { inputTokens: 0, outputTokens: 0, calls: 0 },
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
  await writeJson(store, jobKey(id, "state.json"), state);
  return state;
}

export async function loadJobMaterials(store: Store, id: string): Promise<Material[]> {
  return loadMaterials(store, id);
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
  if (message === "refine-empty") return "refine-empty";
  if (message === "course-full") return "course-full";
  return "step-failed";
}

/** Run exactly one step. Returns the state to save. */
async function runStep(state: JobState, deps: AdvanceDeps, model: ModelClient): Promise<JobState> {
  const { store } = deps;
  const moveOn = (next: Partial<JobState>): JobState => {
    const moved = { ...state, ...next, attempts: 0, error: undefined };
    return { ...moved, step: nextStep({ ...state, ...next }), status: "idle" };
  };

  if (state.step === "context") {
    const [request, materials] = await Promise.all([loadRequest(store, state.id), loadMaterials(store, state.id)]);
    const context = await inferContext(materials, request, model);
    await writeJson(store, jobKey(state.id, "context.json"), context);
    if (context.questions.length > 0) return { ...state, step: "ask", status: "awaiting-review", waiting: "answers", attempts: 0, error: undefined };
    await writeJson(store, jobKey(state.id, "brief.json"), resolveBrief(request, context));
    return { ...state, step: "design", status: "idle", attempts: 0, error: undefined };
  }

  if (state.step === "design" || state.step === "plan") {
    const [brief, materials] = await Promise.all([loadBrief(store, state.id), loadMaterials(store, state.id)]);
    const context = await loadContext(store, state.id, brief);
    const design = await designCourse(materials, brief, context, model);
    await writeJson(store, jobKey(state.id, "design.json"), design);
    await writeJson(store, jobKey(state.id, "plan.json"), design.recommended);
    return { ...state, step: "review", status: "awaiting-review", waiting: "design", lecturesTotal: design.recommended.lectures.length, attempts: 0, error: undefined };
  }

  if (state.step === "expand") {
    const [brief, materials, outline] = await Promise.all([loadBrief(store, state.id), loadMaterials(store, state.id), loadOutline(store, state.id)]);
    const context = await loadContext(store, state.id, brief);
    const plan = await expandOutline(materials, brief, context, outline, model);
    await writeJson(store, jobKey(state.id, "plan.json"), plan);
    return { ...state, step: "lecture:1", status: "idle", lecturesTotal: plan.lectures.length, lecturesDone: 0, attempts: 0, error: undefined };
  }

  if (state.step === "refine-plan") return runRefinePlan(state, deps, model);
  if (state.step.startsWith("refine:")) return runRefineLecture(state, deps, model);
  if (state.step === "append-plan") return runAppendPlan(state, deps, model);
  if (state.step === "finish" && state.kind === "refine") return finishRefine(state, deps);
  if (state.step === "finish" && state.kind === "append") return finishAppend(state, deps);

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
    if (state.kind === "rebuild" && state.courseKey) return finishRebuild(state, deps, files);
    const published = await publishCourse(store, {
      key: courseKeyFor(plan.course.id, state.id),
      files,
      jobId: state.id,
      usage: state.usage,
      now: deps.now(),
      ownerId: state.ownerId,
    });
    const key = courseKeyFor(plan.course.id, state.id);
    await saveBrief(store, key, brief);
    if (state.keepSources && state.ownerId) {
      const kept = (await addSources(store, key, await loadMaterials(store, state.id))) === "ok";
      const meta = await readMeta(store, key);
      if (kept && meta) await store.write(`courses/${key}/meta.json`, JSON.stringify({ ...meta, keepSources: true }));
    }
    await store.delete([jobKey(state.id, "materials.json")]);
    return { ...state, ...published, step: "done", status: "done", attempts: 0, error: undefined };
  }

  // review is left by the outline route; done has nothing to do.
  return state;
}

// ---- Course changes: refine, append, rebuild ---------------------------------------------------------

function courseOf(state: JobState): string {
  if (!state.courseKey) throw new Error("The job has no course.");
  return state.courseKey;
}

async function loadSiteOrFail(store: Store, key: string) {
  const site = await readSite(store, key);
  if (!site) throw new Error("The course is no longer available.");
  return site;
}

/** Pages a lecture's blocks came from, as one range per file. */
function sourceRanges(lecture: LectureFile): { file: string; from: number; to: number }[] {
  const byFile = new Map<string, { from: number; to: number }>();
  for (const block of lecture.sections.flatMap((section) => section.blocks)) {
    for (const source of (block as { source?: { file: string; page: number }[] }).source ?? []) {
      const range = byFile.get(source.file);
      byFile.set(source.file, range ? { from: Math.min(range.from, source.page), to: Math.max(range.to, source.page) } : { from: source.page, to: source.page });
    }
  }
  return [...byFile].map(([file, range]) => ({ file, ...range }));
}

async function runRefinePlan(state: JobState, deps: AdvanceDeps, model: ModelClient): Promise<JobState> {
  const key = courseOf(state);
  const site = await loadSiteOrFail(deps.store, key);
  const note = (await readJson<{ note: string }>(deps.store, jobKey(state.id, "note.json")))?.note ?? "";
  const plan = await planRefinement(note, site, await readBrief(deps.store, key, site), model);
  await writeJson(deps.store, jobKey(state.id, "refine.json"), plan);
  const total = plan.lectures.length;
  return { ...state, step: total > 0 ? "refine:1" : "finish", status: "idle", lecturesTotal: total, lecturesDone: 0, attempts: 0, error: undefined, summary: plan.summary };
}

async function runRefineLecture(state: JobState, deps: AdvanceDeps, model: ModelClient): Promise<JobState> {
  const key = courseOf(state);
  const n = Number(state.step.split(":")[1]);
  const [site, meta, plan] = await Promise.all([loadSiteOrFail(deps.store, key), readMeta(deps.store, key), readJson<{ lectures: { slug: string; instruction: string }[] }>(deps.store, jobKey(state.id, "refine.json"))]);
  const target = plan?.lectures[n - 1];
  const lecture = site.lectures.find((item) => item.meta.slug === target?.slug);
  if (!target || !lecture) throw new Error("The refinement plan is missing.");
  const file = toLectureFile(lecture);
  const sources = meta?.keepSources ? await readSources(deps.store, key) : [];
  const pagesText = sources.length ? renderMaterials(sources, sourceRanges(file)) || null : null;
  const result = await rewriteLecture(file, target.instruction, pagesText, await readBrief(deps.store, key, site), model);
  await writeJson(deps.store, jobKey(state.id, `lectures/${n}.json`), result);
  return { ...state, step: n < state.lecturesTotal ? `refine:${n + 1}` : "finish", status: "idle", lecturesDone: n, attempts: 0, error: undefined };
}

async function finishRefine(state: JobState, deps: AdvanceDeps): Promise<JobState> {
  const key = courseOf(state);
  const site = await loadSiteOrFail(deps.store, key);
  const plan = await readJson<{ course: { title?: string; description?: string } }>(deps.store, jobKey(state.id, "refine.json"));
  const changed: LectureFile[] = [];
  for (let n = 1; n <= state.lecturesTotal; n += 1) {
    const saved = await readJson<{ lecture: unknown; changed: boolean }>(deps.store, jobKey(state.id, `lectures/${n}.json`));
    if (saved?.changed) changed.push(lectureFileSchema.parse(saved.lecture));
  }
  const course = plan?.course ?? {};
  if (changed.length === 0 && !course.title && course.description === undefined) throw new Error("refine-empty");
  await updateCourse(deps.store, key, replaceLectures(site, changed, course), "refine", deps.now());
  deps.onCourseChanged?.(key);
  await releaseBusy(deps.store, key, state.id);
  return { ...state, step: "done", status: "done", attempts: 0, error: undefined, siteUrl: `/courses/${key}/` };
}

async function runAppendPlan(state: JobState, deps: AdvanceDeps, model: ModelClient): Promise<JobState> {
  const key = courseOf(state);
  const site = await loadSiteOrFail(deps.store, key);
  const brief = await readBrief(deps.store, key, site);
  await writeJson(deps.store, jobKey(state.id, "brief.json"), brief);
  const plan = await planAppend(await loadMaterials(deps.store, state.id), brief, site, model);
  await writeJson(deps.store, jobKey(state.id, "append.json"), plan);
  await writeJson(deps.store, jobKey(state.id, "plan.json"), { course: site.course, lectures: plan.lectures, approach: "follow-source", why: "" });
  if (plan.lectures.length === 0) throw new Error("course-full");
  if (plan.restructure) return { ...state, step: "choice", status: "awaiting-review", waiting: "choice", lecturesTotal: plan.lectures.length, attempts: 0, error: undefined };
  return { ...state, step: "lecture:1", status: "idle", lecturesTotal: plan.lectures.length, lecturesDone: 0, attempts: 0, error: undefined };
}

async function finishAppend(state: JobState, deps: AdvanceDeps): Promise<JobState> {
  const key = courseOf(state);
  const [site, meta, plan] = await Promise.all([loadSiteOrFail(deps.store, key), readMeta(deps.store, key), loadPlan(deps.store, state.id)]);
  const files: LectureFile[] = [];
  for (let n = 1; n <= plan.lectures.length; n += 1) {
    const saved = await readJson<{ lecture: unknown }>(deps.store, jobKey(state.id, `lectures/${n}.json`));
    files.push(lectureFileSchema.parse(saved?.lecture));
  }
  await updateCourse(deps.store, key, appendLectures(site, files), "append", deps.now());
  if (meta?.keepSources) await addSources(deps.store, key, await loadMaterials(deps.store, state.id));
  deps.onCourseChanged?.(key);
  await deps.store.delete([jobKey(state.id, "materials.json")]);
  await releaseBusy(deps.store, key, state.id);
  return { ...state, step: "done", status: "done", attempts: 0, error: undefined, siteUrl: `/courses/${key}/` };
}

async function finishRebuild(state: JobState, deps: AdvanceDeps, files: Record<string, string>): Promise<JobState> {
  const key = courseOf(state);
  await updateCourse(deps.store, key, siteFromFiles(key, files), "rebuild", deps.now());
  await deleteSources(deps.store, key);
  await addSources(deps.store, key, await loadMaterials(deps.store, state.id));
  deps.onCourseChanged?.(key);
  await deps.store.delete([jobKey(state.id, "materials.json")]);
  await releaseBusy(deps.store, key, state.id);
  return { ...state, step: "done", status: "done", attempts: 0, error: undefined, siteUrl: `/courses/${key}/` };
}

/** A course-changing job that gives up frees its course lock and, for a refinement, its round. */
async function releaseCourse(state: JobState, store: Store): Promise<void> {
  if (!state.courseKey) return;
  await releaseBusy(store, state.courseKey, state.id).catch(() => undefined);
  if (state.kind === "refine" && state.round) await releaseRound(store, state.courseKey, state.round).catch(() => undefined);
}

/** Steps written by older versions of the portal; they now finish in one go. */
const LEGACY_PUBLISH_STEPS = new Set<string>(["publish", "publish-wait"]);

/** Advance a job by at most one step. Safe to call repeatedly and concurrently. */
export async function advance(id: string, deps: AdvanceDeps): Promise<JobState> {
  const { store } = deps;
  const loaded = await readState(store, id);
  if (!loaded) throw new Error("Job not found.");
  const state: JobState = LEGACY_PUBLISH_STEPS.has(loaded.step) ? { ...loaded, step: "finish", attempts: 0 } : loaded;
  const waits = state.step === "review" || state.step === "ask" || state.step === "choice" || state.step === "done";
  if (state.status === "awaiting-review" || state.status === "done" || state.status === "failed" || waits) {
    return state;
  }
  const now = deps.now();

  if (!(await claimStep(store, id, state.step, state.attempts, now))) {
    const age = await claimAge(store, id, state.step, state.attempts, now);
    if (age !== null && age < CLAIM_TTL_SECONDS) return { ...state, status: "working" };
    const attempts = state.attempts + 1;
    if (attempts >= MAX_ATTEMPTS) {
      const failed: JobState = { ...state, attempts, status: "failed", error: "step-failed" };
      await releaseCourse(failed, store);
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
    if (error instanceof BudgetExceeded || code === "refine-empty" || code === "course-full") {
      const failed: JobState = { ...state, status: "failed", error: code };
      await releaseCourse(failed, store);
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
    if (gaveUp) {
      await releaseCourse(next, store);
      logEvent("job.failed", { jobId: id, step: state.step, code: next.error });
    }
    return saveState(store, addUsage(next), deps.now());
  }
}
