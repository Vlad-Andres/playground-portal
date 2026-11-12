import { createHash, randomBytes } from "node:crypto";
import { slugify } from "@core/generate/plan";
import { siteDataSchema, type SiteData } from "@core/site";
import type { Store } from "@/lib/jobs/store";

/** `<course-slug>-<first 8 hex of the job id>`: safe in a URL and in a storage key. */
export const COURSE_KEY = /^[a-z0-9][a-z0-9-]{0,60}-[0-9a-f]{8}$/;

/** The owner link token: 24 random bytes as base64url, so always 32 characters. */
export const OWNER_TOKEN = /^[A-Za-z0-9_-]{32}$/;

const OWNER_HASH = /^[0-9a-f]{64}$/;

export interface SiteMeta {
  formatVersion: 1;
  jobId: string;
  publishedAt: string;
  updatedAt: string;
  title: string;
  lectures: number;
  usage: { inputTokens: number; outputTokens: number; calls: number };
  /** sha256 hex of the owner token. */
  ownerHash: string;
}

export function courseKeyFor(courseId: string, jobId: string): string {
  return `${slugify(courseId, "course").slice(0, 60).replace(/-+$/, "")}-${jobId.slice(0, 8).toLowerCase()}`;
}

export function siteKey(key: string): string {
  return `courses/${key}/site.json`;
}

function metaKey(key: string): string {
  return `courses/${key}/meta.json`;
}

function ownersKey(hash: string): string {
  return `owners/${hash}.json`;
}

function assertKey(key: string): void {
  if (!COURSE_KEY.test(key)) throw new Error("Invalid course key.");
}

export function newOwnerToken(): string {
  return randomBytes(24).toString("base64url");
}

export function ownerHash(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

/** Writes the site, its metadata and the owner lookup (`owners/<hash>.json`). */
export async function writeSite(store: Store, key: string, site: SiteData, meta: SiteMeta): Promise<void> {
  assertKey(key);
  if (site.key !== key) throw new Error("The site key does not match its storage key.");
  if (meta.ownerHash && !OWNER_HASH.test(meta.ownerHash)) throw new Error("Invalid owner hash.");
  const parsed = siteDataSchema.parse(site);
  await store.write(siteKey(key), JSON.stringify(parsed));
  await store.write(metaKey(key), JSON.stringify(meta));
  if (meta.ownerHash) await store.write(ownersKey(meta.ownerHash), JSON.stringify({ key }));
}

const ZERO_USAGE = { inputTokens: 0, outputTokens: 0, calls: 0 };

function readUsage(value: unknown): SiteMeta["usage"] {
  if (typeof value !== "object" || value === null) return { ...ZERO_USAGE };
  const usage = value as Record<string, unknown>;
  const number = (field: unknown) => (typeof field === "number" && Number.isFinite(field) ? field : 0);
  return { inputTokens: number(usage.inputTokens), outputTokens: number(usage.outputTokens), calls: number(usage.calls) };
}

/**
 * The stored metadata, or null for a bad key, a missing file or a file that is not JSON.
 * A file written before this iteration (only `jobId` and `publishedAt`) is completed with defaults.
 */
export async function readMeta(store: Store, key: string): Promise<SiteMeta | null> {
  if (!COURSE_KEY.test(key)) return null;
  const body = await store.read(metaKey(key));
  if (body === null) return null;
  let value: unknown;
  try {
    value = JSON.parse(body);
  } catch {
    return null;
  }
  if (typeof value !== "object" || value === null) return null;
  const meta = value as Record<string, unknown>;
  if (typeof meta.jobId !== "string" || typeof meta.publishedAt !== "string") return null;
  return {
    formatVersion: 1,
    jobId: meta.jobId,
    publishedAt: meta.publishedAt,
    updatedAt: typeof meta.updatedAt === "string" ? meta.updatedAt : meta.publishedAt,
    title: typeof meta.title === "string" ? meta.title : "",
    lectures: typeof meta.lectures === "number" && Number.isFinite(meta.lectures) ? meta.lectures : 0,
    usage: readUsage(meta.usage),
    ownerHash: typeof meta.ownerHash === "string" ? meta.ownerHash : "",
  };
}

/** The course key for an owner token, or null when the token, the file or the hash do not match. */
export async function findCourseByOwnerToken(store: Store, token: string): Promise<string | null> {
  if (!OWNER_TOKEN.test(token)) return null;
  const hash = ownerHash(token);
  const body = await store.read(ownersKey(hash));
  if (body === null) return null;
  let value: unknown;
  try {
    value = JSON.parse(body);
  } catch {
    return null;
  }
  const key = typeof value === "object" && value !== null ? (value as { key?: unknown }).key : undefined;
  if (typeof key !== "string" || !COURSE_KEY.test(key)) return null;
  const meta = await readMeta(store, key);
  return meta !== null && meta.ownerHash === hash ? key : null;
}

/** The stored course, or null for a bad key, a missing file or a file that is not a valid site. */
export async function readSite(store: Store, key: string): Promise<SiteData | null> {
  if (!COURSE_KEY.test(key)) return null;
  const body = await store.read(siteKey(key));
  if (body === null) return null;
  let value: unknown;
  try {
    value = JSON.parse(body);
  } catch {
    return null;
  }
  const parsed = siteDataSchema.safeParse(value);
  return parsed.success && parsed.data.key === key ? parsed.data : null;
}

/** Remove a course and its owner lookup. Returns false when there was nothing to delete. */
export async function deleteSite(store: Store, key: string): Promise<boolean> {
  if (!COURSE_KEY.test(key)) return false;
  const keys = (await store.list(`courses/${key}/`)).map((entry) => entry.key);
  if (keys.length === 0) return false;
  const meta = await readMeta(store, key);
  await store.delete(keys);
  if (meta && meta.ownerHash) await store.delete([ownersKey(meta.ownerHash)]);
  return true;
}

/** Every stored course, newest published first, at most 200. */
export async function listCourses(store: Store): Promise<{ key: string; meta: SiteMeta }[]> {
  const courses: { key: string; meta: SiteMeta }[] = [];
  for (const { key } of await store.list("courses/")) {
    const match = /^courses\/([^/]+)\/meta\.json$/.exec(key);
    if (!match || !COURSE_KEY.test(match[1])) continue;
    const meta = await readMeta(store, match[1]);
    if (meta !== null) courses.push({ key: match[1], meta });
  }
  const time = (meta: SiteMeta) => Date.parse(meta.publishedAt) || 0;
  courses.sort((a, b) => time(b.meta) - time(a.meta));
  return courses.slice(0, 200);
}
