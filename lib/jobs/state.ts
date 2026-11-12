export type JobKind = "create" | "refine" | "append" | "rebuild";
export type Step =
  | "context" | "ask" | "design" | "review" | "expand" | `lecture:${number}` | "finish" | "done"
  | "refine-plan" | `refine:${number}` | "append-plan" | "choice"
  /** Written by older versions; handled as "design". */
  | "plan";

export interface JobState {
  id: string;
  /** A stored state without kind is a "create" job. */
  kind?: JobKind;
  step: Step;
  /** Set exactly while status is "awaiting-review": what the job waits for. */
  waiting?: "answers" | "design" | "choice";
  status: "idle" | "working" | "awaiting-review" | "done" | "failed";
  lecturesTotal: number;
  lecturesDone: number;
  attempts: number;
  /** A stable error code from the API, never a sentence. */
  error?: string;
  /** "/courses/<key>/" once the course is published. */
  siteUrl?: string;
  /** "/manage/<token>", set when the job is done. */
  manageUrl?: string;
  /** Which invite code created the job; never sent to the browser. */
  codeId?: string;
  usage: { inputTokens: number; outputTokens: number; calls: number };
  createdAt: string;
  updatedAt: string;
}

export const JOB_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export function jobKey(id: string, file: string): string {
  if (!JOB_ID.test(id)) throw new Error("Invalid job id.");
  return `jobs/${id}/${file}`;
}

export function lectureNumber(step: Step): number | null {
  const match = /^lecture:(\d+)$/.exec(step);
  return match ? Number(match[1]) : null;
}
