import type { ExerciseCheck, ExerciseSheet } from "@site/content/types";

export type SelfMark = "correct" | "partial" | "wrong";

export interface TaskState {
  value: string;
  selected: string[];
  checked: boolean;
  revealed: boolean;
  selfMark?: SelfMark;
}

export type ExerciseState = Record<string, TaskState>;

export const emptyTaskState: TaskState = { value: "", selected: [], checked: false, revealed: false };

export function taskKey(sheetId: string, taskId: string) {
  return `${sheetId}:${taskId}`;
}

export function reviveExerciseState(raw: unknown): ExerciseState | null {
  if (!raw || typeof raw !== "object") return null;

  const result: ExerciseState = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!value || typeof value !== "object") continue;
    const entry = value as Partial<TaskState>;
    result[key] = {
      value: typeof entry.value === "string" ? entry.value : "",
      selected: Array.isArray(entry.selected) ? entry.selected.filter((id) => typeof id === "string") : [],
      checked: entry.checked === true,
      revealed: entry.revealed === true,
      selfMark:
        entry.selfMark === "correct" || entry.selfMark === "partial" || entry.selfMark === "wrong"
          ? entry.selfMark
          : undefined,
    };
  }
  return result;
}

function normalise(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, "");
}

export type TaskVerdict = "unanswered" | "correct" | "incorrect" | "open";

export function gradeTask(check: ExerciseCheck, state: TaskState): TaskVerdict {
  if (check.mode === "open") {
    return state.value.trim().length === 0 ? "unanswered" : "open";
  }

  if (check.mode === "text") {
    if (state.value.trim().length === 0) return "unanswered";
    return check.accept.some((accepted) => normalise(accepted) === normalise(state.value))
      ? "correct"
      : "incorrect";
  }

  if (state.selected.length === 0) return "unanswered";
  const expected = [...check.answer].sort();
  const given = [...state.selected].sort();
  return expected.length === given.length && expected.every((value, index) => value === given[index])
    ? "correct"
    : "incorrect";
}

export interface SheetProgress {
  answered: number;
  total: number;
  correct: number;
  autoGradable: number;
}

export function sheetProgress(sheet: ExerciseSheet, state: ExerciseState): SheetProgress {
  let answered = 0;
  let correct = 0;
  let autoGradable = 0;
  let total = 0;

  for (const exercise of sheet.exercises) {
    for (const task of exercise.tasks) {
      total += 1;
      if (task.check.mode !== "open") autoGradable += 1;

      const taskState = state[taskKey(sheet.id, task.id)] ?? emptyTaskState;
      const verdict = gradeTask(task.check, taskState);
      if (verdict !== "unanswered") answered += 1;
      if (verdict === "correct" || taskState.selfMark === "correct") correct += 1;
    }
  }

  return { answered, total, correct, autoGradable };
}
