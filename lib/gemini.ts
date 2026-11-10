import fs from "node:fs/promises";
import path from "node:path";
import { GoogleGenAI } from "@google/genai";
import { readdir } from "node:fs/promises";

const model = process.env.GEMINI_MODEL ?? "gemini-3.1-flash-lite";
const maxOutputBytes = 250 * 1024;
const maxInputBytes = 10 * 1024 * 1024;

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

export async function generateLecture(directory: string, brief: GenerationBrief): Promise<string> {
  const files = (await readdir(directory)).filter((file) => file.startsWith("source-"));
  if (files.length === 0) throw new Error("No source files were found.");
  const totalBytes = (await Promise.all(files.map(async (file) => (await fs.stat(path.join(directory, file))).size)))
    .reduce((total, size) => total + size, 0);
  if (totalBytes > maxInputBytes) throw new Error("Materials exceed the 10 MB generation limit.");

  const ai = new GoogleGenAI({ apiKey: apiKey() });
  const uploaded: { name?: string; uri?: string; mimeType?: string }[] = [];
  try {
    for (const file of files) {
      const filePath = path.join(directory, file);
      const mimeType = file.endsWith(".pdf") ? "application/pdf" : `image/${path.extname(file).slice(1)}`;
      const uploadedFile = (await ai.files.upload({
        file: filePath,
        config: { mimeType, displayName: file },
      })) as unknown as { name?: string; uri?: string; mimeType?: string };
      if (!uploadedFile.name || !uploadedFile.uri || !uploadedFile.mimeType) {
        throw new Error("Gemini upload returned incomplete metadata.");
      }
      uploaded.push(uploadedFile);
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
