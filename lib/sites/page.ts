import { notFound } from "next/navigation";
import type { Metadata } from "next";
import type { SiteData } from "@core/site";
import { loadSite } from "./load";

export interface CourseParams {
  params: Promise<{ key: string }>;
}

/** Base path of a course: every link the shared UI builds starts with it. */
export function courseBase(key: string): string {
  return `/courses/${key}`;
}

/** The course for a route, or the 404 page. */
export async function courseOr404(params: CourseParams["params"]): Promise<{ key: string; data: SiteData }> {
  const { key } = await params;
  const data = await loadSite(key);
  if (!data) notFound();
  return { key, data };
}

/** Title for a course page; published courses are never indexed. */
export async function courseMetadata(params: CourseParams["params"], page?: string): Promise<Metadata> {
  const { key } = await params;
  const data = await loadSite(key);
  if (!data) return { robots: { index: false, follow: false } };
  return {
    title: page ? `${page} · ${data.course.title}` : data.course.title,
    description: data.course.description,
    robots: { index: false, follow: false },
  };
}
