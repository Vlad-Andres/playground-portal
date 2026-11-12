import { createHash, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { briefSchema, checkMaterials, materialSchema, type CoursePlan } from "@core/generate/index";
import {
  dailyJobLimit,
  dayKey,
  dayPrefix,
  generationEnabled,
  isLanguage,
  isLevel,
  underDailyLimit,
} from "@/lib/guard";
import { createJob, loadPlan, readState, advance, type AdvanceDeps } from "@/lib/jobs/steps";
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
};

function fail(code: ApiErrorCode): Response {
  return json({ error: MESSAGES[code], code }, STATUS[code]);
}

const createBodySchema = z
  .object({ accessCode: z.string().max(200), brief: z.unknown(), materials: z.array(z.unknown()).max(50) })
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

  const briefInput = (body.data.brief ?? {}) as Record<string, unknown>;
  if (!isLanguage(briefInput.language) || !isLevel(briefInput.level)) return fail("bad-request");
  const day = dayKey(now);
  const counted = async (prefix: string) => (await store.list(prefix)).length;
  if (!(await underDailyLimit(day, settings.dailyJobLimit ?? dailyJobLimit(env), counted))) {
    return fail("daily-limit");
  }

  const brief = briefSchema.safeParse(body.data.brief);
  if (!brief.success) return fail("bad-request");
  const materials = z.array(materialSchema).safeParse(body.data.materials);
  if (!materials.success) return fail("bad-request");
  const check = checkMaterials(materials.data);
  if (!check.ok) return json({ error: check.message, code: check.code }, 400);

  const { id } = await createJob(store, { brief: brief.data, materials: materials.data, codeId }, now);
  await store.write(`${dayPrefix(day)}${id}`, "1");
  return json({ id }, 202);
}

/** What a job page may see: progress and the result, never usage, models, invite codes or internal files. */
export type PublicJob = Pick<JobState, "id" | "step" | "status" | "lecturesTotal" | "lecturesDone" | "attempts" | "error" | "siteUrl" | "createdAt" | "updatedAt"> & {
  /** "/manage/<token>", shown only once the job is done. */
  manageUrl?: string;
  outline?: { slug: string; title: string; summary: string }[];
};

export function publicJob(state: JobState): PublicJob {
  const { id, step, status, lecturesTotal, lecturesDone, attempts, error, siteUrl, createdAt, updatedAt } = state;
  const result: PublicJob = { id, step, status, lecturesTotal, lecturesDone, attempts, error, siteUrl, createdAt, updatedAt };
  if (status === "done" && state.manageUrl) result.manageUrl = state.manageUrl;
  return result;
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
  if (state.status === "awaiting-review") {
    const plan = await loadPlan(store, id);
    result.outline = plan.lectures.map(({ slug, title, summary }) => ({ slug, title, summary }));
  }
  return json(result);
}

/** POST /api/jobs/:id/advance */
export async function advanceHandler(id: string, deps: () => AdvanceDeps, env: NodeJS.ProcessEnv, settings: Settings = DEFAULT_SETTINGS): Promise<Response> {
  if (!validId(id)) return fail("bad-id");
  if (!generationEnabled(env, settings)) return fail("generation-off");
  let resolved: AdvanceDeps;
  try {
    resolved = deps();
  } catch {
    return fail("generation-off");
  }
  if (!(await readState(resolved.store, id))) return fail("not-found");
  return json(publicJob(await advance(id, resolved)));
}

const outlineSchema = z
  .object({ keep: z.array(z.string().max(80)).min(1).max(12), titles: z.record(z.string(), z.string().trim().min(1).max(120)) })
  .strict();

/** PUT /api/jobs/:id/outline */
export async function outlineHandler(id: string, request: Request, store: Store, now = new Date()): Promise<Response> {
  if (!validId(id)) return fail("bad-id");
  const state = await readState(store, id);
  if (!state) return fail("not-found");
  if (state.status !== "awaiting-review") return fail("wrong-state");
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return fail("bad-request");
  }
  const body = outlineSchema.safeParse(raw);
  if (!body.success) return fail("bad-outline");
  const plan = await loadPlan(store, id);
  const slugs = new Set(plan.lectures.map((lecture) => lecture.slug));
  if (body.data.keep.some((slug) => !slugs.has(slug))) return fail("bad-outline");
  const keep = new Set(body.data.keep);
  const lectures = plan.lectures
    .filter((lecture) => keep.has(lecture.slug))
    .map((lecture, index) => ({ ...lecture, number: index + 1, title: body.data.titles[lecture.slug] ?? lecture.title }));
  const next: CoursePlan = { ...plan, lectures };
  await store.write(jobKey(id, "plan.json"), `${JSON.stringify(next)}\n`);
  const updated: JobState = { ...state, step: "lecture:1", status: "idle", lecturesTotal: lectures.length, lecturesDone: 0, attempts: 0, updatedAt: now.toISOString() };
  await store.write(jobKey(id, "state.json"), `${JSON.stringify(updated)}\n`);
  return json(publicJob(updated));
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
