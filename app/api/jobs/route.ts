import { randomUUID } from "node:crypto";
import { writeStorageFile, countStorageKeys } from "@/lib/storage";
import { jobKey } from "@/lib/job";
import {
  accessCodeMatches,
  dailyJobLimit,
  dayKey,
  dayPrefix,
  generationEnabled,
  isLanguage,
  isLevel,
  underDailyLimit,
} from "@/lib/guard";

export const runtime = "nodejs";
const maxTotalBytes = 4 * 1024 * 1024;
const allowedTypes = new Set(["application/pdf", "image/png", "image/jpeg", "image/webp"]);

function extensionFor(type: string): string {
  return type === "application/pdf" ? "pdf" : type.split("/")[1];
}

export async function POST(request: Request) {
  if (!generationEnabled(process.env)) {
    return Response.json({ error: "Generation is disabled on this server." }, { status: 503 });
  }
  const form = await request.formData();
  if (!accessCodeMatches(String(form.get("accessCode") ?? ""), process.env)) {
    return Response.json({ error: "The access code is not correct." }, { status: 401 });
  }
  const language = form.get("language") ?? "en";
  const level = form.get("level") ?? "university";
  if (!isLanguage(language) || !isLevel(level)) {
    return Response.json({ error: "Unknown language or level." }, { status: 400 });
  }
  const day = dayKey(new Date());
  if (!(await underDailyLimit(day, dailyJobLimit(process.env), countStorageKeys))) {
    return Response.json({ error: "Today's job limit has been reached. Please try again tomorrow." }, { status: 429 });
  }

  const materials = form.getAll("material").filter((value): value is File => value instanceof File);
  if (materials.length === 0 || materials.length > 12 || materials.some((file) => !allowedTypes.has(file.type))) {
    return Response.json({ error: "Upload 1–12 PDF or image files." }, { status: 400 });
  }
  const totalBytes = materials.reduce((total, file) => total + file.size, 0);
  if (materials.some((file) => file.size === 0) || totalBytes > maxTotalBytes) {
    return Response.json({ error: "Files must not be empty and must be at most 4 MB in total." }, { status: 413 });
  }

  const id = randomUUID();
  await writeStorageFile(`${dayPrefix(day)}${id}`, "1", "text/plain");
  const sourceNames = materials.map((material, index) => `source-${index + 1}.${extensionFor(material.type)}`);
  for (const [index, material] of materials.entries()) {
    await writeStorageFile(jobKey(id, sourceNames[index]), material, material.type);
  }
  await writeStorageFile(jobKey(id, "manifest.json"), JSON.stringify(sourceNames) + "\n", "application/json");
  await writeStorageFile(jobKey(id, "brief.json"), JSON.stringify({
    context: String(form.get("context") ?? "").slice(0, 4000),
    language,
    level,
    examPreparation: form.get("examPreparation") === "on",
    figures: form.get("figures") === "on",
    quizzes: form.get("quizzes") === "on",
    interactiveWidgets: form.get("interactiveWidgets") === "on",
  }) + "\n", "application/json");
  await writeStorageFile(jobKey(id), JSON.stringify({ id, status: "accepted" }) + "\n", "application/json");
  return Response.json({ id, status: "accepted" }, { status: 202 });
}
