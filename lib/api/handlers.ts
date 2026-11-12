import { createHash, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { briefSchema, checkMaterials, materialSchema, requestSchema, type ContextQuestion, type CoursePlan, type DesignOutline } from "@core/generate/index";
import {
  dailyJobLimit,
  dayKey,
  dayPrefix,
  generationEnabled,
  isLanguage,
  isLevel,
  underDailyLimit,
} from "@/lib/guard";
import { advance, answerContext, createJob, loadContext, loadDesign, loadRequest, readState, saveJobState, writeJobFile, type AdvanceDeps } from "@/lib/jobs/steps";
import { JOB_ID, jobKey, type JobState } from "@/lib/jobs/state";
import type { Store } from "@/lib/jobs/store";
import { DEFAULT_SETTINGS, matchCode, readSettings, type Settings } from "@/lib/settings";

export const MAX_BODY_BYTES = 4 * 1024 * 1024;
export const RETENTION_DAYS = 7;

function json(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

/** Every API error has a stable code; the English sentence is for logs and API users, the browser translates the code. */
const MESSAGES = {
  "generation-off": "Generation is disabled on this server.",
  "too-large": "The material is larger than 4 MB of text.",
  "bad-request": "The request is not valid.",
  "wrong-code": "The access code is not correct.",
  "daily-limit": "Today's job limit has been reached. Please try again tomorrow.",
  "bad-id": "Invalid job id.",
  "not-found": "Job not found.",
  "wrong-state": "The outline can only be changed while it waits for review.",
  "bad-outline": "Keep at least one lecture; titles have at most 120 characters.",
  "bad-answer": "Answer every question with one of its options.",
  "bad-design": "Choose a design and keep at least one of its lectures; titles have at most 120 characters.",
} as const;

export type ApiErrorCode = keyof typeof MESSAGES;

const STATUS: Record<ApiErrorCode, number> = {
  "generation-off": 503,
  "too-large": 413,
  "bad-request": 400,
  "wrong-code": 401,
  "daily-limit": 429,
  "bad-id": 400,
  "not-found": 404,
  "wrong-state": 409,
  "bad-outline": 400,
  "bad-answer": 400,
  "bad-design": 400,
};

function fail(code: ApiErrorCode): Response {
  return json({ error: MESSAGES[code], code }, STATUS[code]);
}

const createBodySchema = z
  .object({ accessCode: z.string().max(200), request: z.unknown().optional(), brief: z.unknown().optional(), materials: z.array(z.unknown()).max(50) })
  .strict();

/** POST /api/jobs */
export async function createJobHandler(request: Request, store: Store, env: NodeJS.ProcessEnv, now = new Date()): Promise<Response> {
  const settings = await readSettings(store);
  if (!generationEnabled(env, settings)) return fail("generation-off");
  const declared = Number(request.headers.get("content-length") ?? "0");
  if (declared > MAX_BODY_BYTES) return fail("too-large");
  const text = await request.text();
  if (Buffer.byteLength(text, "utf8") > MAX_BODY_BYTES) return fail("too-large");

  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return fail("bad-request");
  }
  const body = createBodySchema.safeParse(raw);
  if (!body.success) return fail("bad-request");
  const codeId = matchCode(body.data.accessCode, env, settings);
  if (codeId === null) return fail("wrong-code");

  // New clients send a request ("auto" allowed); older ones a decided brief.
  const input = ((body.data.request ?? body.data.brief) ?? {}) as Record<string, unknown>;
  const auto = body.data.request !== undefined;
  if (!(isLanguage(input.language) || (auto && input.language === "auto")) || !(isLevel(input.level) || (auto && input.level === "auto"))) return fail("bad-request");
  const day = dayKey(now);
  const counted = async (prefix: string) => (await store.list(prefix)).length;
  if (!(await underDailyLimit(day, settings.dailyJobLimit ?? dailyJobLimit(env), counted))) {
    return fail("daily-limit");
  }

  const courseRequest = auto ? requestSchema.safeParse(body.data.request) : null;
  const brief = auto ? null : briefSchema.safeParse(body.data.brief);
  if ((courseRequest && !courseRequest.success) || (brief && !brief.success)) return fail("bad-request");
  const materials = z.array(materialSchema).safeParse(body.data.materials);
  if (!materials.success) return fail("bad-request");
  const check = checkMaterials(materials.data);
  if (!check.ok) return json({ error: check.message, code: check.code }, 400);

  const { id } = await createJob(
    store,
    courseRequest?.success ? { request: courseRequest.data, materials: materials.data, codeId } : { brief: brief!.data!, materials: materials.data, codeId },
    now,
  );
  await store.write(`${dayPrefix(day)}${id}`, "1");
  return json({ id }, 202);
}

/** What a job page may see: progress and the result, never usage, models, invite codes or internal files. */
export interface PublicDesignOption {
  id: "recommended" | "alt-1" | "alt-2";
  approach: string;
  why: string;
  lectures: { slug: string; title: string; summary: string; forms: string[] }[];
}

export type PublicJob = Pick<JobState, "id" | "kind" | "step" | "status" | "waiting" | "lecturesTotal" | "lecturesDone" | "attempts" | "error" | "siteUrl" | "createdAt" | "updatedAt"> & {
  /** "/manage/<token>", shown only once the job is done. */
  manageUrl?: string;
  /** Only while waiting for answers. */
  questions?: ContextQuestion[];
  /** Only while waiting for the design choice. */
  design?: { language: string; level: string; subject: string; goals: string[]; assumptions: string[]; options: PublicDesignOption[] };
  /** Package D: what a refinement changed. */
  summary?: string;
  /** Package D: the reorganisation offer while waiting for a choice. */
  choice?: { reason: string; affected: { slug: string; title: string }[]; canReorganize: boolean };
};

export function publicJob(state: JobState): PublicJob {
  const { id, step, status, lecturesTotal, lecturesDone, attempts, error, siteUrl, createdAt, updatedAt } = state;
  const result: PublicJob = { id, kind: state.kind ?? "create", step, status, lecturesTotal, lecturesDone, attempts, error, siteUrl, createdAt, updatedAt };
  if (status === "awaiting-review") result.waiting = waitingOf(state);
  if (status === "done" && state.manageUrl) result.manageUrl = state.manageUrl;
  return result;
}

/** Older jobs paused at "review" without a waiting field are waiting for the design. */
function waitingOf(state: JobState): JobState["waiting"] {
  if (state.status !== "awaiting-review") return undefined;
  return state.waiting ?? (state.step === "review" ? "design" : undefined);
}

function validId(id: string): boolean {
  return JOB_ID.test(id);
}

/** GET /api/jobs/:id — state, plus the outline while waiting for review. Never materials or brief context. */
export async function getJobHandler(id: string, store: Store): Promise<Response> {
  if (!validId(id)) return fail("bad-id");
  const state = await readState(store, id);
  if (!state) return fail("not-found");
  const result: PublicJob = publicJob(state);
  const waiting = waitingOf(state);
  if (waiting === "answers") result.questions = (await loadContext(store, id)).questions;
  if (waiting === "design") {
    const [design, context] = await Promise.all([loadDesign(store, id), loadContext(store, id)]);
    const plan = design.recommended;
    result.design = {
      language: plan.course.language,
      level: plan.course.level ?? context.level,
      subject: context.subject || plan.course.title,
      goals: context.goals,
      assumptions: context.assumptions,
      options: [
        {
          id: "recommended",
          approach: plan.approach,
          why: plan.why,
          lectures: plan.lectures.map(({ slug, title, summary, sections }) => ({ slug, title, summary, forms: [...new Set(sections.flatMap((section) => section.blocks))].slice(0, 4) })),
        },
        ...design.alternatives.map((alt: DesignOutline) => ({ id: alt.id, approach: alt.approach, why: alt.why, lectures: alt.lectures.map(({ slug, title, summary }) => ({ slug, title, summary, forms: [] as string[] })) })),
      ],
    };
  }
  return json(result);
}

/** Whether the server should keep driving the job on its own after this step finished. */
export function shouldChain(state: Pick<JobState, "status" | "error">): boolean {
  // A step that just failed stays idle-with-error so the page's "Try again" decides; everything else waits for the user.
  return state.status === "idle" && !state.error;
}

/** POST /api/jobs/:id/advance — like advanceHandler, but also returns the new state (null on an error response). */
export async function advanceJob(id: string, deps: () => AdvanceDeps, env: NodeJS.ProcessEnv, settings: Settings = DEFAULT_SETTINGS): Promise<{ response: Response; state: JobState | null }> {
  if (!validId(id)) return { response: fail("bad-id"), state: null };
  if (!generationEnabled(env, settings)) return { response: fail("generation-off"), state: null };
  let resolved: AdvanceDeps;
  try {
    resolved = deps();
  } catch {
    return { response: fail("generation-off"), state: null };
  }
  if (!(await readState(resolved.store, id))) return { response: fail("not-found"), state: null };
  const state = await advance(id, resolved);
  return { response: json(publicJob(state)), state };
}

/** POST /api/jobs/:id/advance */
export async function advanceHandler(id: string, deps: () => AdvanceDeps, env: NodeJS.ProcessEnv, settings: Settings = DEFAULT_SETTINGS): Promise<Response> {
  return (await advanceJob(id, deps, env, settings)).response;
}

async function readBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return undefined;
  }
}

const answersSchema = z.object({ answers: z.record(z.string(), z.string().max(40)) }).strict();

/** PUT /api/jobs/:id/answers — the language and/or focus questions. */
export async function answersHandler(id: string, request: Request, store: Store, now = new Date()): Promise<Response> {
  if (!validId(id)) return fail("bad-id");
  const state = await readState(store, id);
  if (!state) return fail("not-found");
  if (waitingOf(state) !== "answers") return fail("wrong-state");
  const body = answersSchema.safeParse(await readBody(request));
  if (!body.success || Object.keys(body.data.answers).length > 4) return fail("bad-answer");
  const [context, courseRequest] = await Promise.all([loadContext(store, id), loadRequest(store, id)]);
  const answered = answerContext(context, courseRequest, body.data.answers);
  if (!answered.ok) return fail("bad-answer");
  await writeJobFile(store, id, "context.json", answered.context);
  await writeJobFile(store, id, "brief.json", answered.brief);
  const updated = await saveJobState(store, { ...state, step: "design", status: "idle", waiting: undefined, attempts: 0, error: undefined }, now);
  return json(publicJob(updated));
}

const designSchema = z
  .object({
    choice: z.enum(["recommended", "alt-1", "alt-2"]).default("recommended"),
    keep: z.array(z.string().max(80)).min(1).max(12),
    titles: z.record(z.string(), z.string().trim().min(1).max(120)),
  })
  .strict();

/** PUT /api/jobs/:id/design — pick the recommendation or an alternative, rename or remove lectures. */
export async function designHandler(id: string, request: Request, store: Store, now = new Date()): Promise<Response> {
  if (!validId(id)) return fail("bad-id");
  const state = await readState(store, id);
  if (!state) return fail("not-found");
  if (waitingOf(state) !== "design") return fail("wrong-state");
  const body = designSchema.safeParse(await readBody(request));
  if (!body.success) return fail("bad-design");
  const design = await loadDesign(store, id);
  const keep = new Set(body.data.keep);
  const titled = <T extends { slug: string; title: string }>(lectures: T[]) =>
    lectures.filter((lecture) => keep.has(lecture.slug)).map((lecture, index) => ({ ...lecture, number: index + 1, title: body.data.titles[lecture.slug] ?? lecture.title }));
  const base = { ...state, status: "idle" as const, waiting: undefined, lecturesDone: 0, attempts: 0, error: undefined };

  if (body.data.choice === "recommended") {
    const plan = design.recommended;
    if (body.data.keep.some((slug) => !plan.lectures.some((lecture) => lecture.slug === slug))) return fail("bad-design");
    const next: CoursePlan = { ...plan, lectures: titled(plan.lectures) };
    await writeJobFile(store, id, "plan.json", next);
    return json(publicJob(await saveJobState(store, { ...base, step: "lecture:1", lecturesTotal: next.lectures.length }, now)));
  }
  const outline = design.alternatives.find((alt) => alt.id === body.data.choice);
  if (!outline || body.data.keep.some((slug) => !outline.lectures.some((lecture) => lecture.slug === slug))) return fail("bad-design");
  const chosen: DesignOutline = { ...outline, lectures: titled(outline.lectures).map(({ number: _number, ...lecture }) => lecture) };
  await writeJobFile(store, id, "outline.json", chosen);
  return json(publicJob(await saveJobState(store, { ...base, step: "expand", lecturesTotal: chosen.lectures.length }, now)));
}

function secretMatches(header: string | null, secret: string | undefined): boolean {
  if (!secret || secret.length < 16 || !header) return false;
  const digest = (value: string) => createHash("sha256").update(value).digest();
  return timingSafeEqual(digest(header), digest(`Bearer ${secret}`));
}

/** GET /api/cron/cleanup — deletes jobs (and day markers) older than RETENTION_DAYS. */
export async function cleanupHandler(request: Request, store: Store, env: NodeJS.ProcessEnv, now = new Date()): Promise<Response> {
  if (!secretMatches(request.headers.get("authorization"), env.CRON_SECRET)) return json({ error: "Unauthorized.", code: "unauthorized" }, 401);
  const cutoff = now.getTime() - RETENTION_DAYS * 86_400_000;
  const byJob = new Map<string, { keys: string[]; oldest: number }>();
  for (const { key, uploadedAt } of await store.list("jobs/")) {
    const id = key.split("/")[1];
    const entry = byJob.get(id) ?? { keys: [], oldest: Number.POSITIVE_INFINITY };
    entry.keys.push(key);
    entry.oldest = Math.min(entry.oldest, uploadedAt.getTime());
    byJob.set(id, entry);
  }
  let deletedJobs = 0;
  for (const [id, entry] of byJob) {
    let created = entry.oldest;
    if (validId(id)) {
      const state = await readState(store, id).catch(() => null);
      if (state?.createdAt) created = Date.parse(state.createdAt);
    }
    if (created < cutoff) {
      await store.delete(entry.keys);
      deletedJobs += 1;
    }
  }
  const oldMarkers = (await store.list("days/")).filter(({ key }) => Date.parse(key.split("/")[1] ?? "") < cutoff).map(({ key }) => key);
  await store.delete(oldMarkers);
  return json({ deletedJobs, deletedMarkers: oldMarkers.length });
}
