import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { Store } from "@/lib/jobs/store";
import { logEvent } from "@/lib/log";
import { recordMetric } from "@/lib/metrics";
import { COURSE_KEY, readMeta } from "@/lib/sites/store";

export const FEEDBACK_PER_COURSE_PER_HOUR = 10;

/** Private feedback for the owner: a rating, an optional comment and where it was given. Nothing about the person. */
export interface Feedback {
  id: string;
  courseKey: string;
  where: "created" | "course";
  rating: number;
  comment: string;
  createdAt: string;
}

const bodySchema = z
  .object({
    courseKey: z.string().regex(COURSE_KEY),
    where: z.enum(["created", "course"]),
    rating: z.number().int().min(1).max(5),
    comment: z.string().trim().max(1000).optional(),
  })
  .strict();

const storedSchema = z.object({
  id: z.string(),
  courseKey: z.string(),
  where: z.enum(["created", "course"]),
  rating: z.number().int().min(1).max(5),
  comment: z.string(),
  createdAt: z.string(),
});

const ratePrefix = (courseKey: string, now: Date) => `feedback-rate/${courseKey}/${now.toISOString().slice(0, 13)}/`;

export async function createFeedbackHandler(request: Request, store: Store, now: Date = new Date()): Promise<Response> {
  let raw: unknown;
  try {
    raw = JSON.parse((await request.text()).slice(0, 4000));
  } catch {
    return Response.json({ code: "bad-request" }, { status: 400 });
  }
  const body = bodySchema.safeParse(raw);
  if (!body.success || !(await readMeta(store, body.data.courseKey))) return Response.json({ code: "bad-request" }, { status: 400 });
  const prefix = ratePrefix(body.data.courseKey, now);
  if ((await store.list(prefix)).length >= FEEDBACK_PER_COURSE_PER_HOUR) return Response.json({ code: "too-many" }, { status: 429 });

  const entry: Feedback = {
    id: randomUUID(),
    courseKey: body.data.courseKey,
    where: body.data.where,
    rating: body.data.rating,
    comment: body.data.comment ?? "",
    createdAt: now.toISOString(),
  };
  await store.write(`feedback/${entry.id}.json`, `${JSON.stringify(entry)}\n`);
  await store.write(`${prefix}${entry.id}`, "1");
  logEvent("feedback.created", { where: entry.where, rating: entry.rating });
  await recordMetric(store, "feedback_sent", now, { courseKey: entry.courseKey });
  return Response.json({ ok: true }, { status: 202 });
}

/** All feedback, newest first. */
export async function listFeedback(store: Store): Promise<Feedback[]> {
  const entries = await Promise.all(
    (await store.list("feedback/")).map(async ({ key }) => {
      try {
        const parsed = storedSchema.safeParse(JSON.parse((await store.read(key)) ?? ""));
        return parsed.success ? parsed.data : null;
      } catch {
        return null;
      }
    }),
  );
  return entries.filter((entry): entry is Feedback => entry !== null).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** Average rating (one decimal) and count per course. */
export function summariseFeedback(entries: Feedback[]): Record<string, { count: number; average: number }> {
  const totals: Record<string, { count: number; sum: number }> = {};
  for (const entry of entries) {
    const total = (totals[entry.courseKey] ??= { count: 0, sum: 0 });
    total.count += 1;
    total.sum += entry.rating;
  }
  return Object.fromEntries(Object.entries(totals).map(([key, { count, sum }]) => [key, { count, average: Math.round((sum / count) * 10) / 10 }]));
}
