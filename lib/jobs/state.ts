export type Step = "plan" | "review" | `lecture:${number}` | "finish" | "publish" | "publish-wait" | "done";

export interface JobState {
  id: string;
  step: Step;
  status: "idle" | "working" | "awaiting-review" | "done" | "failed";
  lecturesTotal: number;
  lecturesDone: number;
  attempts: number;
  error?: string;
  siteUrl?: string;
  bundleReady: boolean;
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
