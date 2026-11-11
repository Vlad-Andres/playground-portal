import type { LectureFile } from "../schema";
import { validateCourseData, type Problem } from "../validate";
import type { CoursePlan } from "./plan";
import type { Brief } from "./types";

export const DEFAULT_BUDGET = { inputTokens: 600_000, outputTokens: 120_000 };

const EXAM_QUESTIONS_PER_LECTURE = 3;

function json(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

export function lectureFileName(lecture: LectureFile): string {
  return `lectures/${String(lecture.meta.number).padStart(2, "0")}-${lecture.meta.slug}.json`;
}

function examFile(plan: CoursePlan, lectures: LectureFile[]): LectureFile {
  const exam = plan.exam ?? { title: "Exam training", intro: "" };
  return {
    meta: {
      slug: "exam",
      number: 0,
      title: exam.title,
      subtitle: plan.course.title,
      summary: exam.intro,
      topics: [],
      difficulty: "core",
      estimatedMinutes: 60,
      sources: [],
      objectives: [],
      takeaways: [],
    },
    concepts: [],
    quiz: lectures.flatMap((lecture) =>
      lecture.quiz.slice(0, EXAM_QUESTIONS_PER_LECTURE).map((question) => ({ ...question, id: `l${lecture.meta.number}-${question.id}` })),
    ),
    sections: [
      {
        id: "mock-exam",
        title: exam.title,
        kind: "playground",
        blocks: [
          { kind: "prose", md: exam.intro || exam.title },
          { kind: "widget", type: "mock-exam", title: "Mock exam" },
        ],
      },
    ],
  };
}

/** Course files for the content folder (no model call). Problems with severity "error" are generator bugs. */
export function finishCourse(plan: CoursePlan, lectures: LectureFile[], brief: Brief): { files: Record<string, string>; problems: Problem[] } {
  const course = { ...plan.course, indexable: false };
  const files: Record<string, string> = { "course.json": json(course) };
  for (const lecture of lectures) files[lectureFileName(lecture)] = json(lecture);
  const exam = plan.exam && brief.examMode ? examFile(plan, lectures) : null;
  if (exam) files["exam.json"] = json(exam);
  const problems = validateCourseData({
    course,
    lectures: lectures.map((data) => ({ file: lectureFileName(data), data })),
    exam,
    expected: [],
    figures: new Set(),
  });
  return { files, problems };
}
