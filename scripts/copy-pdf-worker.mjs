import { copyFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const src = path.join(root, "node_modules/pdfjs-dist/legacy/build/pdf.worker.min.mjs");
const dest = path.join(root, "public/pdf.worker.min.mjs");

await copyFile(src, dest);
console.log("pdf.worker.min.mjs copiado a public/");
