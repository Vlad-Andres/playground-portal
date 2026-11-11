export interface SitePaths {
  home: string;
  lecture(slug: string): string;
  exam: string;
  expected: string;
  difficult: string;
}

/**
 * Every link a site renders goes through these paths. The template serves from
 * the root (`base = ""`); the portal mounts a course under `/courses/<key>`.
 */
export function sitePaths(base: string): SitePaths {
  const prefix = base.replace(/\/+$/, "");
  return {
    home: `${prefix}/`,
    lecture: (slug) => `${prefix}/lectures/${slug}/`,
    exam: `${prefix}/exam/`,
    expected: `${prefix}/expected/`,
    difficult: `${prefix}/difficult/`,
  };
}
