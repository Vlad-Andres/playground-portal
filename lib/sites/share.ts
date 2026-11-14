const COURSE_PATH = /^\/courses\/([a-z0-9][a-z0-9-]{0,80})\/?$/;

/**
 * The link a creator may share: only a course page, never a job, management or account link.
 * Anything else gives null, so a share button can never copy a private link by mistake.
 */
export function courseShareUrl(origin: string, siteUrl: string): string | null {
  const match = COURSE_PATH.exec(siteUrl);
  return match ? `${origin}/courses/${match[1]}/` : null;
}
