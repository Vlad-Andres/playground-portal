import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";
const maxBytes = 10 * 1024 * 1024;

export async function POST(request: Request) {
  const form = await request.formData();
  const material = form.get("material");
  if (!(material instanceof File) || material.type !== "application/pdf") {
    return Response.json({ error: "Upload one PDF file." }, { status: 400 });
  }
  if (material.size === 0 || material.size > maxBytes) {
    return Response.json({ error: "PDF must be between 1 byte and 10 MB." }, { status: 413 });
  }

  const id = randomUUID();
  const directory = path.join(process.cwd(), "jobs", id);
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, "source.pdf"), Buffer.from(await material.arrayBuffer()), { flag: "wx" });
  await writeFile(path.join(directory, "status.json"), JSON.stringify({ id, status: "accepted" }) + "\n", { flag: "wx" });
  return Response.json({ id, status: "accepted" }, { status: 202 });
}
