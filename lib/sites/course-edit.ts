import type { Store } from "@/lib/jobs/store";
import { applyCoursePatch, coursePatchSchema } from "./edit";
import { removeCourse, restoreVersion, updateCourse } from "./library";
import { readSite } from "./store";

export type EditResult = { ok: true } | { ok: false; code: string };

/** Apply an owner's hand edit through the versioned update. The caller has already checked access. */
export async function editCourse(store: Store, key: string, patch: unknown, now: Date): Promise<EditResult> {
  const parsed = coursePatchSchema.safeParse(patch);
  if (!parsed.success) return { ok: false, code: "bad-request" };
  const site = await readSite(store, key);
  if (!site) return { ok: false, code: "not-found" };
  const result = applyCoursePatch(site, parsed.data);
  if (!result.ok) return { ok: false, code: result.code };
  await updateCourse(store, key, result.site, "edit", now);
  return { ok: true };
}

export async function restoreCourse(store: Store, key: string, n: number, now: Date): Promise<EditResult> {
  return (await restoreVersion(store, key, Number(n), now)) ? { ok: true } : { ok: false, code: "not-found" };
}

export async function deleteCourse(store: Store, key: string): Promise<boolean> {
  return removeCourse(store, key);
}
