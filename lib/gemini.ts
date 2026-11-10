import fs from "node:fs/promises";
import path from "node:path";
import { GoogleGenAI } from "@google/genai";

const model = process.env.GEMINI_MODEL ?? "gemini-3.1-flash-lite";
const maxOutputBytes = 250 * 1024;
const maxInputBytes = 10 * 1024 * 1024;

function apiKey(): string {
  const value = process.env.GEMINI_API_KEY;
  if (!value) throw new Error("GEMINI_API_KEY is not configured on the server.");
  return value;
}

export async function generateLecture(pdfPath: string): Promise<string> {
  const pdf = await fs.readFile(pdfPath);
  if (pdf.byteLength > maxInputBytes) throw new Error("PDF exceeds the 10 MB generation limit.");

  const ai = new GoogleGenAI({ apiKey: apiKey() });
  let uploaded: { name?: string; uri?: string; mimeType?: string } | undefined;
  try {
    uploaded = (await ai.files.upload({
      file: pdfPath,
      config: { mimeType: "application/pdf", displayName: path.basename(pdfPath) },
    })) as unknown as typeof uploaded;
    if (!uploaded?.name || !uploaded.uri || !uploaded.mimeType) throw new Error("Gemini upload returned incomplete metadata.");

    const response = await ai.models.generateContent({
      model,
      contents: [{
        role: "user",
        parts: [
          { fileData: { fileUri: uploaded.uri, mimeType: uploaded.mimeType } },
          {
            text: `Return one source-grounded lecture JSON object. Use only facts in the PDF.
Use the required fields meta, concepts, quiz, and sections. Every section block must be a prose
block exactly shaped as {"kind":"prose","md":"..."}. Use short Markdown paragraphs with page
references. Do not invent facts, add HTML, executable code, figures, widgets, quizzes, or tables.
Return JSON only.`,
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
    if (uploaded?.name) {
      try {
        await ai.files.delete({ name: uploaded.name });
      } catch {
        console.error("Gemini uploaded-file cleanup failed.");
      }
    }
  }
}
