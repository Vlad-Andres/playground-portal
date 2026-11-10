import { notFound } from "next/navigation";
import { jobKey, readJob } from "@/lib/job";
import { readStorageFile } from "@/lib/storage";
import CourseRuntime from "./CourseRuntime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type JsonObject = Record<string, unknown>;

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function list(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function object(value: unknown): JsonObject {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonObject : {};
}

function records(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (value && typeof value === "object") return Object.values(value);
  return [];
}

function firstText(value: JsonObject, keys: string[]): string {
  for (const key of keys) {
    const candidate = text(value[key]);
    if (candidate) return candidate;
  }
  return "";
}

function firstString(value: JsonObject, excluded: string[] = []): string {
  for (const [key, candidate] of Object.entries(value)) {
    if (excluded.includes(key)) continue;
    if (typeof candidate === "string" && candidate.trim()) return candidate;
  }
  return "";
}

function readable(value: unknown): string {
  if (typeof value === "string") return value;
  if (value && typeof value === "object") {
    const record = object(value);
    return firstString(record, ["id", "kind", "type"]);
  }
  return "";
}

function humanText(value: unknown, depth = 0): string {
  if (depth > 3) return "";
  if (typeof value === "string") return value.trim();
  if (Array.isArray(value)) return value.map((item) => humanText(item, depth + 1)).filter(Boolean).join(" ");
  if (!value || typeof value !== "object") return "";
  return Object.entries(object(value))
    .filter(([key]) => !["id", "kind", "type", "slug", "number"].includes(key))
    .map(([, item]) => humanText(item, depth + 1))
    .filter(Boolean)
    .join(" ");
}

function paragraphs(markdown: string) {
  return markdown.split(/\n{2,}/).filter(Boolean).map((paragraph, index) => (
    <p key={index}>{paragraph.replace(/^#+\s/, "")}</p>
  ));
}

export default async function CoursePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const job = await readJob(id);
  if (!job || job.status !== "completed") notFound();

  let lecture: JsonObject;
  try {
    lecture = JSON.parse((await readStorageFile(jobKey(id, "lecture.json"))).toString("utf8")) as JsonObject;
  } catch {
    notFound();
  }

  const content = object(lecture.lecture ?? lecture.course ?? lecture);
  const meta = object(content.meta ?? content);
  const concepts = records(content.concepts);
  const sections = records(content.sections).map(object);
  const objectives = list(meta.objectives);
  const takeaways = list(meta.takeaways);

  const brief = await readStorageFile(jobKey(id, "brief.json")).then((value) => JSON.parse(value.toString("utf8"))).catch(() => ({}));
  return <CourseRuntime id={id} title={text(meta.title)} subtitle={text(meta.subtitle) || text(meta.summary)} objectives={objectives} takeaways={takeaways} concepts={concepts} sections={sections} quiz={records(content.quiz).map(object)} examPreparation={brief.examPreparation === true} />;
}
