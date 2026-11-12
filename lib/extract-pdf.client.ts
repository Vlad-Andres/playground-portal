"use client";

import { joinTextItems, splitTextIntoPages, type Material } from "@core/generate/index";

const MAX_FILE_BYTES = 50 * 1024 * 1024;

/** Read a PDF's text page by page in the browser. The PDF itself never leaves the device. */
export async function extractPdf(file: File): Promise<Material> {
  if (file.size > MAX_FILE_BYTES) throw new Error("This PDF is larger than 50 MB.");
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
  const task = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()), disableFontFace: true, verbosity: 0 });
  const document = await task.promise;
  const pages = [];
  try {
    for (let n = 1; n <= document.numPages; n += 1) {
      const page = await document.getPage(n);
      pages.push({ n, text: joinTextItems((await page.getTextContent()).items) });
      page.cleanup();
    }
  } finally {
    // pdf.js 6 removes PDFDocumentProxy.destroy(); the loading task owns the worker teardown.
    await task.destroy();
  }
  return { name: file.name, pages };
}

/** PDFs are read with pdf.js; .txt and .md become pages of about 3,000 characters. */
export async function extractMaterial(file: File): Promise<Material> {
  if (/\.pdf$/i.test(file.name) || file.type === "application/pdf") return extractPdf(file);
  if (/\.(txt|md|markdown)$/i.test(file.name) || file.type.startsWith("text/")) {
    if (file.size > MAX_FILE_BYTES) throw new Error("This file is larger than 50 MB.");
    return { name: file.name, pages: splitTextIntoPages(await file.text()) };
  }
  throw new Error("Use PDF, .txt or .md files.");
}
