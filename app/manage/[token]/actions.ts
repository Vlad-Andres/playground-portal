"use server";

import { updateTag } from "next/cache";
import { defaultStore } from "@/lib/jobs/store";
import { logEvent } from "@/lib/log";
import { deleteCourse, editCourse, restoreCourse, type EditResult } from "@/lib/sites/course-edit";
import { courseTag } from "@/lib/sites/load";
import { findCourseByOwnerToken } from "@/lib/sites/store";

/** None of these actions logs or returns the token; the token is the only proof of ownership. */
export async function saveCourse(token: string, patch: unknown): Promise<EditResult> {
  const store = defaultStore();
  const key = await findCourseByOwnerToken(store, String(token));
  if (key === null) return { ok: false, code: "not-found" };
  const result = await editCourse(store, key, patch, new Date());
  if (result.ok) updateTag(courseTag(key));
  return result;
}

export async function removeCourse(token: string): Promise<{ ok: boolean }> {
  const store = defaultStore();
  const key = await findCourseByOwnerToken(store, String(token));
  if (key === null) return { ok: false };
  if (!(await deleteCourse(store, key))) return { ok: false };
  updateTag(courseTag(key));
  logEvent("course.deleted", { key, by: "owner" });
  return { ok: true };
}

export async function restore(token: string, n: number): Promise<EditResult> {
  const store = defaultStore();
  const key = await findCourseByOwnerToken(store, String(token));
  if (key === null) return { ok: false, code: "not-found" };
  const result = await restoreCourse(store, key, n, new Date());
  if (result.ok) updateTag(courseTag(key));
  return result;
}
