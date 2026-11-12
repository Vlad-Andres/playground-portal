import { isBundlePath } from "@core/generate/bundle";
import { courseSchema, lectureFileSchema, type LectureFile } from "@core/schema";
import { buildSiteData, type SiteData } from "@core/site";
import type { JobState } from "@/lib/jobs/state";
import type { Store } from "@/lib/jobs/store";
import { logEvent } from "@/lib/log";
import { COURSE_KEY, newOwnerToken, ownerHash, writeSite } from "./store";

function parseFile<T>(files: Record<string, string>, path: string, parse: (value: unknown) => T): T {
  const body = files[path];
  if (body === undefined) throw new Error(`The course bundle has no ${path}.`);
  return parse(JSON.parse(body));
}

/** Build the stored site from a finished course bundle. Pure apart from throwing on bad input. */
export function siteFromFiles(key: string, files: Record<string, string>): SiteData {
  if (!COURSE_KEY.test(key)) throw new Error("Invalid course key.");
  const paths = Object.keys(files);
  const bad = paths.filter((path) => !isBundlePath(path));
  if (bad.length) throw new Error(`Not allowed in a bundle: ${bad.join(", ")}`);

  const course = parseFile(files, "course.json", (value) => courseSchema.parse(value));
  const lectures: LectureFile[] = paths
    .filter((path) => path.startsWith("lectures/"))
    .map((path) => parseFile(files, path, (value) => lectureFileSchema.parse(value)));
  const exam = files["exam.json"] === undefined ? null : parseFile(files, "exam.json", (value) => lectureFileSchema.parse(value));

  return buildSiteData({ key, course, lectures, exam, expected: [] });
}

/**
 * Store a finished course as `courses/<key>/site.json` and return its public URL plus the
 * creator's private edit link. The token is only ever stored hashed, and only in `meta.json`.
 */
export async function publishCourse(
  store: Store,
  input: { key: string; files: Record<string, string>; jobId: string; usage: JobState["usage"]; now: Date },
): Promise<{ siteUrl: string; manageUrl: string }> {
  const site = siteFromFiles(input.key, input.files);
  const token = newOwnerToken();
  const publishedAt = input.now.toISOString();
  await writeSite(store, input.key, site, {
    formatVersion: 1,
    jobId: input.jobId,
    publishedAt,
    updatedAt: publishedAt,
    title: site.course.title,
    lectures: site.lectures.length,
    usage: input.usage,
    ownerHash: ownerHash(token),
  });
  logEvent("course.published", { key: input.key, jobId: input.jobId, lectures: site.lectures.length });
  return { siteUrl: `/courses/${input.key}/`, manageUrl: `/manage/${token}` };
}
