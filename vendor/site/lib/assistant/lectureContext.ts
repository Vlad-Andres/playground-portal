import type { Block, Concept, ExerciseSheet, ExerciseTask, Lecture, QuizQuestion } from "@site/content/types";

function table(headers: string[], rows: string[][]) {
  const line = (cells: string[]) => `| ${cells.map((cell) => cell.replace(/\|/g, "\\|")).join(" | ")} |`;
  return [line(headers), line(headers.map(() => "---")), ...rows.map(line)].join("\n");
}

function exerciseTasks(tasks: ExerciseTask[]) {
  return tasks.map((task, taskIndex) => {
    const label = String.fromCharCode(97 + taskIndex);
    const answer =
      task.check.mode === "select"
        ? `Options: ${task.check.options.join(" · ")}\nCorrect: ${task.check.answer.join(" · ")}`
        : task.check.mode === "text"
          ? `Accepted answers: ${task.check.accept.join(", ")}`
          : "Open question, self-assessed.";
    return `**(${label})** ${task.prompt}\n${answer}\n\nOfficial solution:\n${task.solution}`;
  });
}

function exerciseSheet(sheet: ExerciseSheet) {
  return sheet.exercises
    .map((exercise, exerciseIndex) => {
      return [
        `### Exercise ${exerciseIndex + 1}: ${exercise.title}`,
        exercise.intro ?? "",
        ...exerciseTasks(exercise.tasks),
      ]
        .filter(Boolean)
        .join("\n\n");
    })
    .join("\n\n");
}

function block(item: Block, concepts: Concept[]): string {
  switch (item.kind) {
    case "prose":
      return item.md;
    case "info":
      return `> **${item.title}** (${item.variant})\n>\n${item.md
        .split("\n")
        .map((line) => `> ${line}`)
        .join("\n")}`;
    case "concepts":
      return `Key concepts here: ${item.ids
        .map((id) => concepts.find((concept) => concept.id === id)?.term ?? id)
        .join(", ")} (defined in the glossary below).`;
    case "formula":
      return `$$${item.tex}$$${item.caption ? `\n${item.caption}` : ""}`;
    case "code":
      return `\`\`\`${item.lang}\n${item.code}\n\`\`\`${item.caption ? `\n${item.caption}` : ""}`;
    case "table":
      return `${table(item.headers, item.rows)}${item.caption ? `\n\n${item.caption}` : ""}`;
    case "figure":
      return `[Figure: ${item.alt}]${item.caption ? ` ${item.caption}` : ""}`;
    case "steps":
      return [
        `**Worked example: ${item.title}**`,
        item.intro ?? "",
        ...item.steps.map((step, index) => `${index + 1}. **${step.title}** — ${step.md}`),
      ]
        .filter(Boolean)
        .join("\n\n");
    case "timeline":
      return item.items.map((entry) => `- **${entry.label} — ${entry.title}**: ${entry.md}`).join("\n");
    case "widget":
      return `[Interactive widget on the page: "${item.title}"${item.description ? ` — ${item.description}` : ""}]`;
    case "custom":
      return `[Custom interactive component on the page: "${item.title}" — ${item.description}]`;
    case "list":
      return item.items.map((entry) => `- ${entry}`).join("\n");
    case "exercises":
      return `**${item.sheet.title}** (${item.sheet.source})\n\n${exerciseSheet(item.sheet)}`;
    case "recall":
      return `**Memory cards**\n\n${item.cards.map((card) => `- Q: ${card.prompt}\n  A: ${card.answer}`).join("\n")}`;
    case "practice":
      return `**Practice**\n\n${exerciseTasks(item.tasks).join("\n\n")}`;
  }
}

function quiz(questions: QuizQuestion[]) {
  return questions
    .map((question, index) => {
      const options = question.options.map((option) => `  - (${option.id}) ${option.text}`).join("\n");
      const correct = question.options.find((option) => option.id === question.answerId);
      return `${index + 1}. ${question.prompt}\n${options}\n  Correct: (${question.answerId}) ${correct?.text ?? ""}\n  Explanation: ${question.explanation}`;
    })
    .join("\n\n");
}

export function lectureToContext(lecture: Lecture) {
  const { meta, concepts } = lecture;

  const header = [
    meta.number > 0 ? `# Lecture ${meta.number}: ${meta.title}` : `# ${meta.title}`,
    meta.subtitle,
    meta.summary,
    `Sources this lecture was built from:\n${meta.sources
      .map((source) => `- ${source.label}${source.detail ? ` — ${source.detail}` : ""} (${source.kind})`)
      .join("\n")}`,
    `Topics: ${meta.topics.join(", ")}`,
  ].join("\n\n");

  const sections = lecture.sections.map((section) =>
    [`## ${section.title}`, ...section.blocks.map((item) => block(item, concepts))].join("\n\n"),
  );

  const glossary = concepts
    .map((concept) => `- **${concept.term}** — ${concept.short}${concept.detail ? ` ${concept.detail}` : ""}`)
    .join("\n");

  return [
    header,
    ...sections,
    `## Glossary\n\n${glossary}`,
    `## Quiz with answers\n\n${quiz(lecture.quiz)}`,
  ].join("\n\n");
}
