"use server";

import { updateTag } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { defaultStore } from "@/lib/jobs/store";
import { logEvent } from "@/lib/log";
import { deleteCourse, editCourse, restoreCourse, type EditResult } from "@/lib/sites/course-edit";
import { resolveAccess, setKeepSources } from "@/lib/sites/library";
import { courseTag } from "@/lib/sites/load";

/** Every action re-checks the session and the course owner; a failure looks like a missing course. */
async function owned(key: string): Promise<string | null> {
  try {
    const user = await requireUser();
    return (await resolveAccess(defaultStore(), { uid: user.uid, key: String(key) }))?.key ?? null;
  } catch {
    return null;
  }
}

export async function saveMyCourse(key: string, patch: unknown): Promise<EditResult> {
  const found = await owned(key);
  if (!found) return { ok: false, code: "not-found" };
  const result = await editCourse(defaultStore(), found, patch, new Date());
  if (result.ok) updateTag(courseTag(found));
  return result;
}

export async function removeMyCourse(key: string): Promise<{ ok: boolean }> {
  const found = await owned(key);
  if (!found || !(await deleteCourse(defaultStore(), found))) return { ok: false };
  updateTag(courseTag(found));
  logEvent("course.deleted", { key: found, by: "owner" });
  return { ok: true };
}

export async function restoreMyVersion(key: string, n: number): Promise<EditResult> {
  const found = await owned(key);
  if (!found) return { ok: false, code: "not-found" };
  const result = await restoreCourse(defaultStore(), found, n, new Date());
  if (result.ok) updateTag(courseTag(found));
  return result;
}

export async function setKeep(key: string, keep: boolean): Promise<EditResult> {
  const found = await owned(key);
  if (!found) return { ok: false, code: "not-found" };
  await setKeepSources(defaultStore(), found, Boolean(keep), new Date());
  return { ok: true };
}
