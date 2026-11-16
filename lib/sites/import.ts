import { randomBytes } from "node:crypto";
import { bundleSchema } from "@core/generate/bundle";
import type { Store } from "@/lib/jobs/store";
import { publishCourse } from "./publish";
import { courseKeyFor } from "./store";

/** A course bundle file may be at most this large. */
export const MAX_IMPORT_BYTES = 2 * 1024 * 1024;

export type ImportResult = { ok: true; key: string; siteUrl: string; manageUrl: string } | { ok: false; error: string };

/**
 * Publishes a course bundle (`playground-bundle@1`, as written by the template's `npm run generate -- --bundle`)
 * under a new key. Nothing is stored when the bundle or its course is not valid.
 */
export async function importBundle(store: Store, text: string, now: Date): Promise<ImportResult> {
  if (Buffer.byteLength(text, "utf8") > MAX_IMPORT_BYTES) return { ok: false, error: "The file is larger than 2 MB." };
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, error: "The file is not JSON." };
  }
  const bundle = bundleSchema.safeParse(parsed);
  if (!bundle.success) return { ok: false, error: "The file is not a course bundle (playground-bundle@1)." };

  let courseId = "course";
  try {
    const course = JSON.parse(bundle.data.files["course.json"] ?? "{}") as { id?: unknown };
    if (typeof course.id === "string") courseId = course.id;
  } catch {
    // siteFromFiles reports the bad course below
  }
  const jobId = randomBytes(8).toString("hex");
  const key = courseKeyFor(courseId, jobId);
  try {
    const { siteUrl, manageUrl } = await publishCourse(store, { key, files: bundle.data.files, jobId, usage: { inputTokens: 0, outputTokens: 0, calls: 0 }, now });
    return { ok: true, key, siteUrl, manageUrl };
  } catch {
    return { ok: false, error: "The course in the bundle is not valid." };
  }
}
