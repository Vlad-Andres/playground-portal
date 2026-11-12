import { USER_ID } from "@/lib/auth/config";
import type { Store } from "@/lib/jobs/store";
import { logEvent } from "@/lib/log";
import { COURSE_KEY, deleteSite, findCourseByOwnerToken, readMeta, type SiteMeta } from "./store";

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
