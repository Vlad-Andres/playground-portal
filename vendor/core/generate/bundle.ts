import { z } from "zod";

export const BUNDLE_FORMAT = "playground-bundle@1";

/** Only these paths may appear in a bundle (relative to the content folder). */
export function isBundlePath(path: string): boolean {
  if (typeof path !== "string" || path.length === 0 || path.length > 120) return false;
  if (path.startsWith("/") || path.includes("\\") || path.split("/").includes("..") || path.includes("\0")) return false;
  return path === "course.json" || path === "exam.json" || /^lectures\/[A-Za-z0-9][A-Za-z0-9._-]*\.json$/.test(path);
}

export const bundleSchema = z
  .object({
    format: z.literal(BUNDLE_FORMAT),
    files: z.record(z.string(), z.string()).refine((files) => Object.keys(files).every(isBundlePath), "A file path is not allowed in a bundle."),
  })
  .strict();

export type CourseBundle = z.infer<typeof bundleSchema>;

export function makeBundle(files: Record<string, string>): CourseBundle {
  const bad = Object.keys(files).filter((path) => !isBundlePath(path));
  if (bad.length) throw new Error(`Not allowed in a bundle: ${bad.join(", ")}`);
  return { format: BUNDLE_FORMAT, files };
}
