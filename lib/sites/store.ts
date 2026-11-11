import { slugify } from "@core/generate/plan";
import { siteDataSchema, type SiteData } from "@core/site";
import type { Store } from "@/lib/jobs/store";

/** `<course-slug>-<first 8 hex of the job id>`: safe in a URL and in a storage key. */
export const COURSE_KEY = /^[a-z0-9][a-z0-9-]{0,60}-[0-9a-f]{8}$/;

export function courseKeyFor(courseId: string, jobId: string): string {
  return `${slugify(courseId, "course").slice(0, 60).replace(/-+$/, "")}-${jobId.slice(0, 8).toLowerCase()}`;
}

export function siteKey(key: string): string {
  return `courses/${key}/site.json`;
}

function metaKey(key: string): string {
  return `courses/${key}/meta.json`;
}

function assertKey(key: string): void {
  if (!COURSE_KEY.test(key)) throw new Error("Invalid course key.");
}

export async function writeSite(store: Store, key: string, site: SiteData, meta: { jobId: string; publishedAt: string }): Promise<void> {
  assertKey(key);
  if (site.key !== key) throw new Error("The site key does not match its storage key.");
  const parsed = siteDataSchema.parse(site);
  await store.write(siteKey(key), JSON.stringify(parsed));
  await store.write(metaKey(key), JSON.stringify(meta));
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

/** Remove a course. Returns false when there was nothing to delete. */
export async function deleteSite(store: Store, key: string): Promise<boolean> {
  if (!COURSE_KEY.test(key)) return false;
  const keys = (await store.list(`courses/${key}/`)).map((entry) => entry.key);
  if (keys.length === 0) return false;
  await store.delete(keys);
  return true;
}
