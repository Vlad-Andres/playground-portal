/** Repository name for a generated site: pg-<course id>-<first 8 of the job id>. */
export function repoNameFor(courseId: string, jobId: string): string {
  return `pg-${courseId.slice(0, 40)}-${jobId.slice(0, 8)}`;
}
