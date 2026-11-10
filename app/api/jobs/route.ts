import { randomUUID } from "node:crypto";
import { writeStorageFile } from "@/lib/storage";
import { jobKey } from "@/lib/job";

export const runtime = "nodejs";
const maxBytes = 10 * 1024 * 1024;
const allowedTypes = new Set(["application/pdf", "image/png", "image/jpeg", "image/webp"]);

export async function POST(request: Request) {
  const form = await request.formData();
  const materials = form.getAll("material").filter((value): value is File => value instanceof File);
  if (materials.length === 0 || materials.length > 12 || materials.some((file) => !allowedTypes.has(file.type))) {
    return Response.json({ error: "Upload 1–12 PDF or image files." }, { status: 400 });
  }
  if (materials.some((file) => file.size === 0 || file.size > maxBytes)) {
    return Response.json({ error: "Each file must be between 1 byte and 10 MB." }, { status: 413 });
  }

  const id = randomUUID();
  for (const [index, material] of materials.entries()) {
    const extension = material.type === "application/pdf" ? "pdf" : material.type.split("/")[1];
    await writeStorageFile(jobKey(id, `source-${index + 1}.${extension}`), material, material.type);
  }
  const sourceNames = materials.map((material, index) => {
    const extension = material.type === "application/pdf" ? "pdf" : material.type.split("/")[1];
    return `source-${index + 1}.${extension}`;
  });
  await writeStorageFile(jobKey(id, "manifest.json"), JSON.stringify(sourceNames) + "\n", "application/json");
  await writeStorageFile(jobKey(id, "brief.json"), JSON.stringify({
    context: String(form.get("context") ?? "").slice(0, 4000),
    language: String(form.get("language") ?? "en"),
    level: String(form.get("level") ?? "university"),
    examPreparation: form.get("examPreparation") === "on",
    figures: form.get("figures") === "on",
    quizzes: form.get("quizzes") === "on",
    interactiveWidgets: form.get("interactiveWidgets") === "on",
  }) + "\n", "application/json");
  await writeStorageFile(jobKey(id), JSON.stringify({ id, status: "accepted" }) + "\n", "application/json");
  return Response.json({ id, status: "accepted" }, { status: 202 });
}
