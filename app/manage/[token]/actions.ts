"use server";

import { updateTag } from "next/cache";
import { defaultStore } from "@/lib/jobs/store";
import { logEvent } from "@/lib/log";
import { applyCoursePatch, coursePatchSchema } from "@/lib/sites/edit";
import { courseTag } from "@/lib/sites/load";
import { removeCourse as removeFromLibrary } from "@/lib/sites/library";
import { findCourseByOwnerToken, readMeta, readSite, writeSite } from "@/lib/sites/store";

/** Neither action logs or returns the token; the token is the only proof of ownership. */
export async function saveCourse(token: string, patch: unknown): Promise<{ ok: true } | { ok: false; code: string }> {
  const store = defaultStore();
  const key = await findCourseByOwnerToken(store, String(token));
  if (key === null) return { ok: false, code: "not-found" };
  const parsed = coursePatchSchema.safeParse(patch);
  if (!parsed.success) return { ok: false, code: "bad-request" };
  const [site, meta] = await Promise.all([readSite(store, key), readMeta(store, key)]);
  if (!site || !meta) return { ok: false, code: "not-found" };
  const result = applyCoursePatch(site, parsed.data);
  if (!result.ok) return { ok: false, code: result.code };
  await writeSite(store, key, result.site, {
    ...meta,
    updatedAt: new Date().toISOString(),
    title: result.site.course.title,
    lectures: result.site.lectures.length,
  });
  updateTag(courseTag(key));
  logEvent("course.updated", { key });
  return { ok: true };
}

export async function removeCourse(token: string): Promise<{ ok: boolean }> {
  const store = defaultStore();
  const key = await findCourseByOwnerToken(store, String(token));
  if (key === null) return { ok: false };
  if (!(await removeFromLibrary(store, key))) return { ok: false };
  updateTag(courseTag(key));
  logEvent("course.deleted", { key, by: "owner" });
  return { ok: true };
}
