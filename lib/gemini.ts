import fs from "node:fs/promises";
import path from "node:path";
import { GoogleGenAI } from "@google/genai";
import { jobKey } from "@/lib/job";
import { readStorageFile } from "@/lib/storage";

const model = process.env.GEMINI_MODEL ?? "gemini-3.1-flash-lite";
const maxOutputBytes = 250 * 1024;
const maxInputBytes = 4 * 1024 * 1024;

function apiKey(): string {
  const value = process.env.GEMINI_API_KEY;
  if (!value) throw new Error("GEMINI_API_KEY is not configured on the server.");
  return value;
}

export interface GenerationBrief {
  context: string;
  language: string;
  level: string;
  examPreparation: boolean;
  figures: boolean;
  quizzes: boolean;
  interactiveWidgets: boolean;
}

export async function generateLecture(id: string, brief: GenerationBrief): Promise<string> {
  // Read through the storage layer in both modes (local files live under jobs/<key>, see lib/storage.ts).
  const files = JSON.parse((await readStorageFile(jobKey(id, "manifest.json"))).toString("utf8")) as string[];
  const sourceFiles = (await Promise.all(files.map(async (file) => {
    try {
      return { name: file, data: await readStorageFile(jobKey(id, file)) };
    } catch {
      return null;
    }
  }))).filter((file): file is { name: string; data: Buffer } => file !== null);
  if (sourceFiles.length === 0) throw new Error("No source files were found.");
  const totalBytes = sourceFiles
    .map((file) => file.data.byteLength)
    .reduce((total, size) => total + size, 0);
  if (totalBytes > maxInputBytes) throw new Error("Materials exceed the 4 MB limit.");

  const ai = new GoogleGenAI({ apiKey: apiKey() });
  const uploaded: { name?: string; uri?: string; mimeType?: string }[] = [];
  try {
    for (const file of sourceFiles) {
      const filePath = path.join("/tmp", `${id}-${file.name}`);
      await fs.writeFile(filePath, file.data);
      const mimeType = file.name.endsWith(".pdf") ? "application/pdf" : `image/${path.extname(file.name).slice(1)}`;
      const uploadedFile = (await ai.files.upload({
        file: filePath,
        config: { mimeType, displayName: file.name },
      })) as unknown as { name?: string; uri?: string; mimeType?: string };
      if (!uploadedFile.name || !uploadedFile.uri || !uploadedFile.mimeType) {
        throw new Error("Gemini upload returned incomplete metadata.");
      }
      uploaded.push(uploadedFile);
      await fs.rm(filePath, { force: true });
    }

    const response = await ai.models.generateContent({
      model,
      contents: [{
        role: "user",
        parts: [
          ...uploaded.map((file) => ({ fileData: { fileUri: file.uri, mimeType: file.mimeType } })),
          {
            text: `Return one source-grounded lecture JSON object in ${brief.language} for a ${brief.level} learner.
Use only facts in the uploaded materials. User context: ${brief.context || "None provided"}.
Use the required fields meta, concepts, quiz, and sections. Every section block must be a prose
block exactly shaped as {"kind":"prose","md":"..."}. Use short Markdown paragraphs with page references.
Exam preparation requested: ${brief.examPreparation}. Quizzes requested: ${brief.quizzes}.
Figures requested: ${brief.figures}. Interactive widgets requested: ${brief.interactiveWidgets}.
For this low-cost first pass, do not invent figures, widgets, quizzes, or tables. Return JSON only.`,
          },
        ],
      }],
      config: {
        responseMimeType: "application/json",
        maxOutputTokens: 12000,
        temperature: 0.1,
      },
    });
    const text = response.text?.trim();
    if (!text) throw new Error("Gemini returned no lecture content.");
    if (Buffer.byteLength(text, "utf8") > maxOutputBytes) throw new Error("Gemini output exceeded the 250 KB limit.");
    JSON.parse(text);
    return text;
  } finally {
    for (const file of uploaded) {
      if (!file.name) continue;
      try {
        await ai.files.delete({ name: file.name });
      } catch {
        console.error("Gemini uploaded-file cleanup failed.");
      }
    }
  }
}
