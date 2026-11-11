import { unstable_cache } from "next/cache";
import type { SiteData } from "@core/site";
import { defaultStore, type Store } from "@/lib/jobs/store";
import { COURSE_KEY, readSite } from "./store";

export function courseTag(key: string): string {
  return `course:${key}`;
}

/** The stored course for a key, cached per key for an hour; a takedown revalidates its tag. */
export async function loadSite(key: string, store: Store = defaultStore()): Promise<SiteData | null> {
  // A bad key never reaches the cache or the store.
  if (!COURSE_KEY.test(key)) return null;
  return unstable_cache(() => readSite(store, key), ["course-site", key], { tags: [courseTag(key)], revalidate: 3600 })();
}
