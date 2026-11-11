import type { Metadata } from "next";
import { findLecture } from "@site/content/lectures";
import { LectureScreen } from "@site/screens/LectureScreen";
import { loadSite } from "@/lib/sites/load";
import { courseOr404 } from "@/lib/sites/page";

interface LecturePageProps {
  params: Promise<{ key: string; slug: string }>;
}

export async function generateMetadata({ params }: LecturePageProps): Promise<Metadata> {
  const { key, slug } = await params;
  const data = await loadSite(key);
  const lecture = data ? findLecture(data.lectures, slug) : undefined;
  if (!data || !lecture) return { robots: { index: false, follow: false } };
  return { title: `${lecture.meta.title} · ${data.course.title}`, description: lecture.meta.summary, robots: { index: false, follow: false } };
}

export default async function CourseLecturePage({ params }: LecturePageProps) {
  const { slug } = await params;
  const { data } = await courseOr404(params);
  return <LectureScreen data={data} slug={slug} />;
}
