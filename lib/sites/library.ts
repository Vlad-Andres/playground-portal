import { briefSchema, materialSchema, type Brief, type Material } from "@core/generate/index";
import { siteDataSchema, type SiteData } from "@core/site";
import { USER_ID } from "@/lib/auth/config";
import type { Store } from "@/lib/jobs/store";
import { logEvent } from "@/lib/log";
import { COURSE_KEY, deleteSite, findCourseByOwnerToken, readMeta, readSite, writeSite, type SiteMeta } from "./store";

/**
 * Everything about who may reach a course. Routes and actions ask here; they never compare owners themselves.
 * A failed check looks exactly like a course that does not exist.
 */

function checkUid(uid: string): void {
  if (!USER_ID.test(uid)) throw new Error("Invalid user id.");
}

export function userCourseKey(uid: string, key: string): string {
  checkUid(uid);
  return `users/${uid}/courses/${key}.json`;
}

export function metaKey(key: string): string {
  return `courses/${key}/meta.json`;
}

export async function writeMeta(store: Store, key: string, meta: SiteMeta): Promise<void> {
  await store.write(metaKey(key), JSON.stringify(meta));
}

export async function resolveAccess(store: Store, access: { token: string } | { uid: string; key: string }): Promise<{ key: string; meta: SiteMeta } | null> {
  if ("token" in access) {
    const key = await findCourseByOwnerToken(store, access.token);
    const meta = key ? await readMeta(store, key) : null;
    return key && meta ? { key, meta } : null;
  }
  checkUid(access.uid);
  if (!COURSE_KEY.test(access.key)) return null;
  const meta = await readMeta(store, access.key);
  return meta && meta.ownerId === access.uid ? { key: access.key, meta } : null;
}

export async function claimCourse(store: Store, token: string, uid: string, _now: Date): Promise<"ok" | "not-found" | "already-claimed"> {
  checkUid(uid);
  const found = await resolveAccess(store, { token });
  if (!found) return "not-found";
  if (found.meta.ownerId === uid) return "ok";
  if (found.meta.ownerId) return "already-claimed";
  await writeMeta(store, found.key, { ...found.meta, ownerId: uid });
  await store.write(userCourseKey(uid, found.key), JSON.stringify({ key: found.key }));
  logEvent("course.claimed", { key: found.key });
  return "ok";
}

export async function listUserCourses(store: Store, uid: string): Promise<{ key: string; meta: SiteMeta }[]> {
  checkUid(uid);
  const courses: { key: string; meta: SiteMeta }[] = [];
  for (const { key: marker } of await store.list(`users/${uid}/courses/`)) {
    const key = /\/courses\/([^/]+)\.json$/.exec(marker)?.[1];
    if (!key || !COURSE_KEY.test(key)) continue;
    const meta = await readMeta(store, key);
    if (meta && meta.ownerId === uid) courses.push({ key, meta });
  }
  return courses.sort((a, b) => Date.parse(b.meta.updatedAt) - Date.parse(a.meta.updatedAt));
}

/** Delete a course with everything under courses/<key>/, its owner lookup and its account marker. */
export async function removeCourse(store: Store, key: string): Promise<boolean> {
  const meta = await readMeta(store, key);
  const removed = await deleteSite(store, key);
  if (removed && meta?.ownerId && USER_ID.test(meta.ownerId)) await store.delete([userCourseKey(meta.ownerId, key)]);
  return removed;
}

/** Remove every course the user owns and every key under users/<uid>/. Returns the removed course keys. */
export async function deleteAccount(store: Store, uid: string): Promise<string[]> {
  checkUid(uid);
  const courses = await listUserCourses(store, uid);
  for (const { key } of courses) await removeCourse(store, key);
  const rest = (await store.list(`users/${uid}/`)).map((entry) => entry.key);
  if (rest.length) await store.delete(rest);
  return courses.map((course) => course.key);
}

// ---- Versions -------------------------------------------------------------------------------------

export const VERSIONS_KEPT = 3;
export type UpdateReason = "edit" | "refine" | "append" | "rebuild" | "restore";
export interface VersionInfo {
  n: number;
  savedAt: string;
  reason: UpdateReason;
  title: string;
  lectures: number;
}

const versionKey = (key: string, n: number) => `courses/${key}/versions/${n}.json`;

/**
 * The only way a published course changes: snapshot the current site, write the new one with version + 1,
 * keep the three newest snapshots. A failed write removes its snapshot again so nothing half-done remains.
 */
export async function updateCourse(store: Store, key: string, next: SiteData, reason: UpdateReason, now: Date, metaPatch: Partial<Pick<SiteMeta, "keepSources">> = {}): Promise<SiteMeta> {
  const [site, meta] = await Promise.all([readSite(store, key), readMeta(store, key)]);
  if (!site || !meta) throw new Error("not-found");
  if (next.key !== key || !siteDataSchema.safeParse(next).success) throw new Error("invalid");
  const snapshot = versionKey(key, meta.version);
  await store.write(snapshot, JSON.stringify({ n: meta.version, savedAt: now.toISOString(), reason, title: site.course.title, lectures: site.lectures.length, site }));
  const updated: SiteMeta = { ...meta, ...metaPatch, version: meta.version + 1, updatedAt: now.toISOString(), title: next.course.title, lectures: next.lectures.length };
  try {
    await writeSite(store, key, next, updated);
  } catch (error) {
    await store.delete([snapshot]);
    throw error;
  }
  const old = (await store.list(`courses/${key}/versions/`))
    .map((entry) => ({ key: entry.key, n: Number(/\/(\d+)\.json$/.exec(entry.key)?.[1] ?? NaN) }))
    .filter((entry) => Number.isFinite(entry.n))
    .sort((a, b) => b.n - a.n)
    .slice(VERSIONS_KEPT)
    .map((entry) => entry.key);
  if (old.length) await store.delete(old);
  logEvent("course.updated", { key, reason, version: updated.version });
  return updated;
}

export async function listVersions(store: Store, key: string): Promise<VersionInfo[]> {
  const versions: VersionInfo[] = [];
  for (const entry of await store.list(`courses/${key}/versions/`)) {
    try {
      const value = JSON.parse((await store.read(entry.key)) ?? "null") as VersionInfo | null;
      if (value && typeof value.n === "number") versions.push({ n: value.n, savedAt: value.savedAt, reason: value.reason, title: value.title, lectures: value.lectures });
    } catch {
      // skip a broken snapshot
    }
  }
  return versions.sort((a, b) => b.n - a.n);
}

export async function restoreVersion(store: Store, key: string, n: number, now: Date): Promise<SiteMeta | null> {
  let site: unknown;
  try {
    site = (JSON.parse((await store.read(versionKey(key, n))) ?? "null") as { site?: unknown } | null)?.site;
  } catch {
    return null;
  }
  const parsed = siteDataSchema.safeParse(site);
  if (!parsed.success || parsed.data.key !== key) return null;
  const meta = await updateCourse(store, key, parsed.data, "restore", now);
  logEvent("course.restored", { key, from: n, version: meta.version });
  return meta;
}

// ---- Brief and kept files ---------------------------------------------------------------------------

export const SOURCE_LIMIT_BYTES = 4 * 1024 * 1024;
export const SOURCE_LIMIT_FILES = 12;

export async function saveBrief(store: Store, key: string, brief: Brief): Promise<void> {
  await store.write(`courses/${key}/brief.json`, JSON.stringify(brief));
}

export async function readBrief(store: Store, key: string, site: SiteData): Promise<Brief> {
  try {
    const parsed = briefSchema.safeParse(JSON.parse((await store.read(`courses/${key}/brief.json`)) ?? "null"));
    if (parsed.success) return parsed.data;
  } catch {
    // fall back below
  }
  return { language: site.course.language, level: site.course.level ?? "university", depth: "standard", examMode: site.exam !== null, quizzes: true, widgets: true, context: "" };
}

const sourcePrefix = (key: string) => `courses/${key}/sources/`;

export async function readSources(store: Store, key: string): Promise<Material[]> {
  const sources: Material[] = [];
  for (const entry of await store.list(sourcePrefix(key))) {
    try {
      const parsed = materialSchema.safeParse(JSON.parse((await store.read(entry.key)) ?? "null"));
      if (parsed.success) sources.push(parsed.data);
    } catch {
      // skip
    }
  }
  return sources.sort((a, b) => a.name.localeCompare(b.name));
}

const bytesOf = (materials: Material[]) => materials.reduce((sum, material) => sum + new TextEncoder().encode(JSON.stringify(material)).length, 0);

export async function sourceUsage(store: Store, key: string): Promise<{ files: number; bytes: number }> {
  const sources = await readSources(store, key);
  return { files: sources.length, bytes: bytesOf(sources) };
}

/** Merge new files into the kept ones (same name replaces); refuse and write nothing beyond the limits. */
export function mergeSources(stored: Material[], added: Material[]): Material[] {
  const byName = new Map(stored.map((material) => [material.name, material]));
  for (const material of added) byName.set(material.name, material);
  return [...byName.values()];
}

export async function addSources(store: Store, key: string, materials: Material[]): Promise<"ok" | "sources-full"> {
  const merged = mergeSources(await readSources(store, key), materials);
  if (merged.length > SOURCE_LIMIT_FILES || bytesOf(merged) > SOURCE_LIMIT_BYTES) return "sources-full";
  await deleteSources(store, key);
  await Promise.all(merged.map((material, index) => store.write(`${sourcePrefix(key)}${index + 1}.json`, JSON.stringify(material))));
  return "ok";
}

export async function deleteSources(store: Store, key: string): Promise<void> {
  const keys = (await store.list(sourcePrefix(key))).map((entry) => entry.key);
  if (keys.length) await store.delete(keys);
}

export async function setKeepSources(store: Store, key: string, keep: boolean, _now: Date): Promise<SiteMeta> {
  const meta = await readMeta(store, key);
  if (!meta) throw new Error("not-found");
  if (!keep) await deleteSources(store, key);
  const next = { ...meta, keepSources: keep };
  await writeMeta(store, key, next);
  const usage = await sourceUsage(store, key);
  logEvent("sources.changed", { key, kept: keep, files: usage.files, bytes: usage.bytes });
  return next;
}

// ---- Refinement rounds and the busy lock ----------------------------------------------------------------

export const ROUNDS_MAX = 3;
export const BUSY_TTL_SECONDS = 7_200;

export async function roundsUsed(store: Store, key: string): Promise<number> {
  return (await store.list(`courses/${key}/rounds/`)).length;
}

/** Claims the first free round with an atomic create; null when all three are used. */
export async function claimRound(store: Store, key: string, jobId: string, now: Date): Promise<number | null> {
  for (let round = 1; round <= ROUNDS_MAX; round += 1) {
    if (await store.create(`courses/${key}/rounds/${round}.json`, JSON.stringify({ jobId, at: now.toISOString() }))) return round;
  }
  return null;
}

export async function releaseRound(store: Store, key: string, round: number): Promise<void> {
  await store.delete([`courses/${key}/rounds/${round}.json`]);
}

const busyKey = (key: string) => `courses/${key}/busy.json`;

export async function claimBusy(store: Store, key: string, jobId: string, now: Date): Promise<boolean> {
  const body = JSON.stringify({ jobId, at: now.toISOString() });
  if (await store.create(busyKey(key), body)) return true;
  try {
    const held = JSON.parse((await store.read(busyKey(key))) ?? "null") as { at?: string } | null;
    if (held?.at && now.getTime() - Date.parse(held.at) > BUSY_TTL_SECONDS * 1000) {
      await store.delete([busyKey(key)]);
      return store.create(busyKey(key), body);
    }
  } catch {
    // a broken lock file counts as held
  }
  return false;
}

export async function releaseBusy(store: Store, key: string, jobId: string): Promise<void> {
  try {
    const held = JSON.parse((await store.read(busyKey(key))) ?? "null") as { jobId?: string } | null;
    if (held?.jobId === jobId) await store.delete([busyKey(key)]);
  } catch {
    // nothing to release
  }
}
