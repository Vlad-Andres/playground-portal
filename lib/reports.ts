import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { Store } from "@/lib/jobs/store";
import { logEvent } from "@/lib/log";
import { recordMetric } from "@/lib/metrics";
import { COURSE_KEY, readMeta } from "@/lib/sites/store";

export const REPORT_CATEGORIES = ["wrong-content", "copyright", "other"] as const;
export type ReportCategory = (typeof REPORT_CATEGORIES)[number];
export const REPORTS_PER_COURSE_PER_HOUR = 5;

/** A report keeps no course text: only what the person chose to tell us. */
export interface Report {
  id: string;
  courseKey: string;
  category: ReportCategory;
  message: string;
  email: string;
  createdAt: string;
  status: "open" | "dismissed";
}

const bodySchema = z
  .object({
    courseKey: z.string().regex(COURSE_KEY),
    category: z.enum(REPORT_CATEGORIES),
    message: z.string().trim().max(1000).optional(),
    email: z.union([z.literal(""), z.string().trim().email().max(200)]).optional(),
  })
  .strict();

const reportSchema = z.object({
  id: z.string(),
  courseKey: z.string(),
  category: z.enum(REPORT_CATEGORIES),
  message: z.string(),
  email: z.string(),
  createdAt: z.string(),
  status: z.enum(["open", "dismissed"]),
});

const reportKey = (id: string) => `reports/${id}.json`;
const ratePrefix = (courseKey: string, now: Date) => `report-rate/${courseKey}/${now.toISOString().slice(0, 13)}/`;

function answer(status: number, code: string): Response {
  return Response.json({ code }, { status });
}

export async function createReportHandler(request: Request, store: Store, now: Date = new Date()): Promise<Response> {
  let raw: unknown;
  try {
    raw = JSON.parse((await request.text()).slice(0, 8000));
  } catch {
    return answer(400, "bad-request");
  }
  const body = bodySchema.safeParse(raw);
  if (!body.success) return answer(400, "bad-request");
  if (!(await readMeta(store, body.data.courseKey))) return answer(400, "bad-request");
  const prefix = ratePrefix(body.data.courseKey, now);
  if ((await store.list(prefix)).length >= REPORTS_PER_COURSE_PER_HOUR) return answer(429, "too-many-reports");

  const report: Report = {
    id: randomUUID(),
    courseKey: body.data.courseKey,
    category: body.data.category,
    message: body.data.message ?? "",
    email: body.data.email ?? "",
    createdAt: now.toISOString(),
    status: "open",
  };
  await store.write(reportKey(report.id), `${JSON.stringify(report)}\n`);
  await store.write(`${prefix}${report.id}`, "1");
  logEvent("report.created", { category: report.category });
  await recordMetric(store, "report_sent", now, { courseKey: report.courseKey });
  return Response.json({ ok: true }, { status: 202 });
}

async function readReport(store: Store, id: string): Promise<Report | null> {
  const body = await store.read(reportKey(id));
  if (body === null) return null;
  try {
    const parsed = reportSchema.safeParse(JSON.parse(body));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

/** Open reports, newest first. */
export async function listOpenReports(store: Store): Promise<Report[]> {
  const entries = await store.list("reports/");
  const reports = await Promise.all(entries.map((entry) => readReport(store, entry.key.slice("reports/".length).replace(/\.json$/, ""))));
  return reports
    .filter((report): report is Report => report !== null && report.status === "open")
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function setReportStatus(store: Store, id: string, status: Report["status"]): Promise<boolean> {
  if (!/^[0-9a-f-]{36}$/.test(id)) return false;
  const report = await readReport(store, id);
  if (!report) return false;
  await store.write(reportKey(id), `${JSON.stringify({ ...report, status })}\n`);
  return true;
}
