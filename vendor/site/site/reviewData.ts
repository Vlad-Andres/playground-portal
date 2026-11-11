import type { SiteData } from "@core/site";
import type { Lecture } from "@site/content/types";
import { toReviewBlock, type ReviewData, type ReviewLecture } from "@site/lib/reviewData";
import { sitePaths } from "@site/site/paths";

function toReviewLecture(lecture: Lecture, href: string): ReviewLecture {
  return {
    slug: lecture.meta.slug,
    number: lecture.meta.number,
    title: lecture.meta.title,
    href,
    concepts: lecture.concepts,
    quiz: lecture.quiz,
    sections: lecture.sections.map((section) => ({
      id: section.id,
      title: section.title,
      blocks: section.blocks.map(toReviewBlock),
    })),
  };
}

/** The JSON the difficult-parts hub fetches, with links rooted at `base`. */
export function buildReviewData(data: SiteData, base: string): ReviewData {
  const paths = sitePaths(base);
  const lectures = data.lectures.map((lecture) =>
    toReviewLecture(lecture, paths.lecture(lecture.meta.slug)),
  );
  if (data.exam) lectures.push(toReviewLecture(data.exam, paths.exam));
  return { lectures };
}
