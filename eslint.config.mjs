import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Exploración local (no forma parte del sitio) y worker de pdfjs
    // copiado por scripts/copy-pdf-worker.mjs (ver package.json).
    "scratch/**",
    "public/pdf.worker.min.mjs",
  ]),
]);

export default eslintConfig;
