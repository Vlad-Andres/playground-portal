import { blockSchema, type Block, type Course, type ExpectedTopic, type LectureFile } from "./schema";
import { widgetManifest, type WidgetType } from "./widgets";

export interface Problem {
  code: string;
  severity: "error" | "warning";
  file: string;
  path: string;
  message: string;
  fix: string;
}

export interface CourseData {
  course: Course | null;
  lectures: { file: string; data: LectureFile }[];
  exam: LectureFile | null;
  expected: ExpectedTopic[];
  /** File names (relative paths) under the content folder's figures/ directory. */
  figures: ReadonlySet<string>;
}

type IssueLike = { path: readonly PropertyKey[]; message: string };

export function issuePath(issue: IssueLike): string {
  return issue.path
    .map((part) => (typeof part === "number" ? `[${part}]` : String(part)))
    .join(".")
    .replace(".[", "[");
}

export function schemaProblems(file: string, issues: readonly IssueLike[]): Problem[] {
  return issues.map((issue) => ({
    code: "E003",
    severity: "error" as const,
    file,
    path: issuePath(issue),
    message: issue.message,
    fix: "Change this value to match the content schema.",
  }));
}

function widgetProblems(file: string, blockPath: string, block: Extract<Block, { kind: "widget" }>): Problem[] {
  const entry = widgetManifest[block.type as WidgetType];
  const at = (suffix: string) => (blockPath ? `${blockPath}.${suffix}` : suffix);
  if (!entry) {
    return [
      {
        code: "E104",
        severity: "error",
        file,
        path: at("type"),
        message: `Widget "${block.type}" is not registered.`,
        fix: "Set type to a widget listed in the widget manifest.",
      },
    ];
  }
  const parsed = block.props ? entry.props.safeParse(block.props) : null;
  if (parsed && !parsed.success) {
    const details = parsed.error.issues
      .slice(0, 5)
      .map((issue) => `${issuePath(issue) || "props"}: ${issue.message}`)
      .join("; ");
    return [
      {
        code: "E105",
        severity: "error",
        file,
        path: at("props"),
        message: `Props do not match the "${block.type}" widget schema (${details}).`,
        fix: `Remove unsupported props or change them to match the "${block.type}" widget schema.`,
      },
    ];
  }
  return [];
}

function selectAnswerProblems(block: Block): Problem[] {
  const tasks =
    block.kind === "practice"
      ? block.tasks.map((task, index) => ({ task, path: `tasks[${index}]` }))
      : block.kind === "exercises"
        ? block.sheet.exercises.flatMap((exercise, exerciseIndex) =>
            exercise.tasks.map((task, taskIndex) => ({ task, path: `sheet.exercises[${exerciseIndex}].tasks[${taskIndex}]` })),
          )
        : [];
  return tasks.flatMap(({ task, path }) => {
    if (task.check.mode !== "select") return [];
    const options = task.check.options;
    return task.check.answer
      .map((answer, answerIndex) => ({ answer, answerIndex }))
      .filter(({ answer }) => !options.includes(answer))
      .map(({ answer, answerIndex }) => ({
        code: "E108",
        severity: "error" as const,
        file: "",
        path: `${path}.check.answer[${answerIndex}]`,
        message: `Answer "${answer}" is not one of the check options.`,
        fix: "Set every answer to one of the check options.",
      }));
  });
}

/**
 * Checks for one block: schema (E003), widget type and props (E104/E105) and select answers (E108).
 * Paths are relative to the block; file is "".
 */
export function validateBlock(block: unknown): Problem[] {
  const result = blockSchema.safeParse(block);
  if (!result.success) return schemaProblems("", result.error.issues);
  return result.data.kind === "widget" ? widgetProblems("", "", result.data) : selectAnswerProblems(result.data);
}

function duplicateProblem(file: string, valuePath: string, value: string, kind: string): Problem {
  return {
    code: "E101",
    severity: "error",
    file,
    path: valuePath,
    message: `Duplicate ${kind} "${value}".`,
    fix: `Change this ${kind} so it is unique.`,
  };
}

function addDuplicate(
  seen: Map<string, string>,
  value: string,
  file: string,
  valuePath: string,
  kind: string,
  problems: Problem[],
): void {
  if (seen.has(value)) problems.push(duplicateProblem(file, valuePath, value, kind));
  else seen.set(value, file);
}

function wordCount(value: string): number {
  return value.trim() ? value.trim().split(/\s+/).length : 0;
}

export function checkLectureFile(file: string, data: LectureFile, figures: ReadonlySet<string>): Problem[] {
  const problems: Problem[] = [];
  const conceptIds = new Map<string, string>();
  for (let index = 0; index < data.concepts.length; index += 1) {
    addDuplicate(conceptIds, data.concepts[index].id, file, `concepts[${index}].id`, "concept id", problems);
  }

  const questionIds = new Map<string, string>();
  for (let index = 0; index < data.quiz.length; index += 1) {
    const question = data.quiz[index];
    addDuplicate(questionIds, question.id, file, `quiz[${index}].id`, "quiz question id", problems);
    if (!question.options.some((option) => option.id === question.answerId)) {
      problems.push({
        code: "E103",
        severity: "error",
        file,
        path: `quiz[${index}].answerId`,
        message: `Answer "${question.answerId}" is not one of the question's options.`,
        fix: "Set answerId to the id of one of this question's options.",
      });
    }
  }

  const sectionIds = new Map<string, string>();
  for (let sectionIndex = 0; sectionIndex < data.sections.length; sectionIndex += 1) {
    const section = data.sections[sectionIndex];
    addDuplicate(sectionIds, section.id, file, `sections[${sectionIndex}].id`, "section id", problems);
    for (let blockIndex = 0; blockIndex < section.blocks.length; blockIndex += 1) {
      const block = section.blocks[blockIndex];
      const blockPath = `sections[${sectionIndex}].blocks[${blockIndex}]`;
      if (block.kind === "concepts") {
        block.ids.forEach((id, idIndex) => {
          if (!conceptIds.has(id)) {
            problems.push({
              code: "E102",
              severity: "error",
              file,
              path: `${blockPath}.ids[${idIndex}]`,
              message: `Concept "${id}" is not defined in this lecture.`,
              fix: `Add a concept with id "${id}" to "concepts", or remove "${id}" from this block.`,
            });
          }
        });
      }
      if (block.kind === "widget") problems.push(...widgetProblems(file, blockPath, block));
      if (block.kind === "figure" && !figures.has(block.src)) {
        problems.push({
          code: "E106",
          severity: "error",
          file,
          path: `${blockPath}.src`,
          message: `Figure "${block.src}" does not exist.`,
          fix: `Add "${block.src}" under the content folder's figures directory, or change src.`,
        });
      }
      if (block.kind === "exercises") {
        block.sheet.exercises.forEach((exercise, exerciseIndex) =>
          exercise.tasks.forEach((task, taskIndex) => {
            if (task.check.mode !== "select") return;
            const check = task.check;
            check.answer.forEach((answer, answerIndex) => {
              if (!check.options.includes(answer)) {
                problems.push({
                  code: "E108",
                  severity: "error",
                  file,
                  path: `${blockPath}.sheet.exercises[${exerciseIndex}].tasks[${taskIndex}].check.answer[${answerIndex}]`,
                  message: `Answer "${answer}" is not one of the check options.`,
                  fix: "Set every answer to one of the check options.",
                });
              }
            });
          }),
        );
      }
      if (block.kind === "practice") {
        block.tasks.forEach((task, taskIndex) => {
          if (task.check.mode !== "select") return;
          const check = task.check;
          check.answer.forEach((answer, answerIndex) => {
            if (!check.options.includes(answer)) {
              problems.push({
                code: "E108",
                severity: "error",
                file,
                path: `${blockPath}.tasks[${taskIndex}].check.answer[${answerIndex}]`,
                message: `Answer "${answer}" is not one of the check options.`,
                fix: "Set every answer to one of the check options.",
              });
            }
          });
        });
      }
      if ((block.kind === "prose" || block.kind === "info") && wordCount(block.md) > 80) {
        problems.push({
          code: "W201",
          severity: "warning",
          file,
          path: `${blockPath}.md`,
          message: "This Markdown block has more than 80 words.",
          fix: "Shorten this block to 80 words or fewer.",
        });
      }
    }
  }
  return problems;
}

export function validateCourseData(loaded: CourseData): Problem[] {
  const problems: Problem[] = [];
  const slugs = new Map<string, string>();
  const numbers = new Map<string, string>();
  const lectureSlugs = new Set(loaded.lectures.map(({ data }) => data.meta.slug));

  for (const { file, data } of loaded.lectures) {
    addDuplicate(slugs, data.meta.slug, file, "meta.slug", data.meta.slug, problems);
    addDuplicate(numbers, String(data.meta.number), file, "meta.number", "lecture number", problems);

    const expectedFile = `${String(data.meta.number).padStart(2, "0")}-${data.meta.slug}.json`;
    if (file.split("/").pop() !== expectedFile) {
      problems.push({
        code: "E107",
        severity: "error",
        file,
        path: "",
        message: `Lecture filename must be "${expectedFile}".`,
        fix: `Rename this file to "${expectedFile}".`,
      });
    }

    problems.push(...checkLectureFile(file, data, loaded.figures));
  }

  if (loaded.exam) problems.push(...checkLectureFile("exam.json", loaded.exam, loaded.figures));

  loaded.expected.forEach((topic, topicIndex) =>
    topic.links.forEach((link, linkIndex) => {
      if (!lectureSlugs.has(link.slug)) {
        problems.push({
          code: "E109",
          severity: "error",
          file: "expected.json",
          path: `[${topicIndex}].links[${linkIndex}].slug`,
          message: `Lecture slug "${link.slug}" is not defined.`,
          fix: `Change slug to one of the lecture slugs in the content folder.`,
        });
      }
    }),
  );

  return problems;
}

export function formatProblem(problem: Problem): string {
  return `${problem.code} ${problem.file} ${problem.path}: ${problem.message} Fix: ${problem.fix}`;
}
