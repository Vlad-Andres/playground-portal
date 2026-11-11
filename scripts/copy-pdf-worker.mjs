// Serves the pdf.js worker from this app (the CSP allows scripts from 'self' only).
import fs from "node:fs";
fs.mkdirSync("public", { recursive: true });
fs.copyFileSync("node_modules/pdfjs-dist/legacy/build/pdf.worker.min.mjs", "public/pdf.worker.min.mjs");
