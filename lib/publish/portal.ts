import { courseSchema, lectureFileSchema, type LectureFile } from "@core/schema";
import { buildSiteData } from "@core/site";
import { isBundlePath } from "@core/generate/bundle";
import type { Store } from "@/lib/jobs/store";
import { COURSE_KEY, readSite, writeSite } from "@/lib/sites/store";
import type { Publisher } from "./types";

function parseFile<T>(files: Record<string, string>, path: string, parse: (value: unknown) => T): T {
  const body = files[path];
  if (body === undefined) throw new Error(`The course bundle has no ${path}.`);
  return parse(JSON.parse(body));
}

/**
 * Publishes a course bundle as `courses/<key>/site.json` in the portal's own store; the portal then
 * renders it at `/courses/<key>/`. `repoName` is the course key, `commitSha` the publish time.
 */
export function portalPublisher(store: Store, now: () => Date = () => new Date()): Publisher {
  return {
    async start({ repoName: key, files, jobId }) {
      if (!COURSE_KEY.test(key)) throw new Error("Invalid course key.");
      const paths = Object.keys(files);
      const bad = paths.filter((path) => !isBundlePath(path));
      if (bad.length) throw new Error(`Not allowed in a bundle: ${bad.join(", ")}`);

      const course = parseFile(files, "course.json", (value) => courseSchema.parse(value));
      const lectures: LectureFile[] = paths
        .filter((path) => path.startsWith("lectures/"))
        .map((path) => parseFile(files, path, (value) => lectureFileSchema.parse(value)));
      const exam = files["exam.json"] === undefined ? null : parseFile(files, "exam.json", (value) => lectureFileSchema.parse(value));

      const publishedAt = now().toISOString();
      const site = buildSiteData({ key, course, lectures, exam, expected: [] });
      await writeSite(store, key, site, { jobId: jobId ?? key.slice(-8), publishedAt });
      return { repo: key, commitSha: publishedAt };
    },
    async check({ repo }) {
      return (await readSite(store, repo)) ? { state: "live", siteUrl: `/courses/${repo}/` } : { state: "failed" };
    },
  };
}
