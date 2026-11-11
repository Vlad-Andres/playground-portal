import type { Course, LectureFile } from "@core/schema";

/** A one-lecture course for tests that render the vendored template UI. */
export const fixtureCourse: Course = {
  id: "demo",
  title: "Demo course",
  shortTitle: "Demo",
  description: "A demo course.",
  language: "en",
  indexable: false,
};

export const fixtureLecture: LectureFile = {
  meta: {
    slug: "intro",
    number: 1,
    title: "Introduction",
    subtitle: "Start here",
    summary: "A short introduction.",
    topics: ["basics"],
    difficulty: "intro",
    estimatedMinutes: 10,
    sources: [],
    objectives: ["Understand the basics."],
    takeaways: ["The basics matter."],
  },
  concepts: [{ id: "c1", term: "Concept", short: "A concept." }],
  quiz: [
    {
      id: "q1",
      prompt: "Which option is correct?",
      options: [
        { id: "a", text: "A" },
        { id: "b", text: "B" },
      ],
      answerId: "a",
      explanation: "A is correct.",
    },
  ],
  sections: [
    {
      id: "s1",
      title: "Basics",
      kind: "concepts",
      blocks: [
        { kind: "prose", md: "Welcome." },
        { kind: "concepts", ids: ["c1"] },
      ],
    },
  ],
};
